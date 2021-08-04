import * as cdk from "@aws-cdk/core";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as iam from "@aws-cdk/aws-iam";
import * as logs from "@aws-cdk/aws-logs";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";

import { addresses as contractAddresses, MarketFactoryType } from "@augurproject/smart";

const chainlinkDefaultPort = 6688;
const mumbaiNetworkID = 80001;

const findMarketFactory = (marketFactoryType: MarketFactoryType): string => {
  const marketFactoryAddresses = contractAddresses[mumbaiNetworkID]?.marketFactories || [];
  const marketFactory = marketFactoryAddresses.find((i) => i.type === marketFactoryType);
  if (typeof marketFactory === "undefined") {
    // This will fail when an attempt to add the job is made.
    return "NO_CONTRACT";
  }

  return marketFactory.address;
};

export class ChainlinkStack extends cdk.Stack {
  public readonly httpVpcLink: cdk.CfnResource;
  public readonly httpApiListener: elbv2.ApplicationListener;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, "ProducerVPC");

    // ECS Cluster
    const cluster = new ecs.Cluster(this, "Fargate Cluster", {
      vpc: vpc,
    });

    // Task Role
    const taskrole = new iam.Role(this, "ecsTaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    taskrole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy")
    );

    // Log Groups
    const logGroup = new logs.LogGroup(this, "authorServiceLogGroup", {
      logGroupName: "/ecs/ChainlinkService",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const logDriver = new ecs.AwsLogDriver({
      logGroup,
      streamPrefix: "Chainlink",
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "serviceTaskDef", {
      memoryLimitMiB: 2048,
      cpu: 1024,
      taskRole: taskrole,
      volumes: [
        {
          name: "chainlinkVolume",
        },
      ],
    });

    const mySecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "MUMBAI_CHAINLINK_ADAPTER",
      "MUMBAI_CHAINLINK_ADAPTER"
    );

    const node = taskDefinition.addContainer("node", {
      essential: true,
      image: ecs.ContainerImage.fromRegistry("smartcontract/chainlink:0.10.9"),
      logging: logDriver,
      command: ["local", "n", "-p", "/chainlink/.password", "-a", "/chainlink/.api"],
      healthCheck: {
        command: ["CMD", "chainlink", "jobs", "--json", "list"],
        interval: cdk.Duration.seconds(10),
        timeout: cdk.Duration.seconds(5),
        retries: 5,
      },
      environment: {
        DEFAULT_HTTP_TIMEOUT: "1h",
        ETH_URL: mySecret.secretValueFromJson("RPC_URL").toString(),
        ETH_CHAIN_ID: "80001",
        LOG_LEVEL: "debug",
        CHAINLINK_TLS_PORT: "0",
        SECURE_COOKIES: "false",
        ALLOW_ORIGINS: "*",
        DATABASE_URL: "postgresql://postgres:password@localhost:5432/postgres?sslmode=disable",
      },
    });
    node.addPortMappings({
      containerPort: chainlinkDefaultPort,
    });

    const db = taskDefinition.addContainer("db", {
      essential: true,
      image: ecs.ContainerImage.fromRegistry("postgres"),
      logging: logDriver,
      environment: {
        POSTGRES_USER: "postgres",
        POSTGRES_PASSWORD: "password",
      },
      healthCheck: {
        command: ["CMD-SHELL", "pg_isready"],
        interval: cdk.Duration.seconds(10),
        timeout: cdk.Duration.seconds(5),
        retries: 5,
      },
    });
    db.addPortMappings({
      containerPort: 5432,
    });

    const credentialGenerator = taskDefinition.addContainer("credentialGenerator", {
      essential: false,
      image: ecs.ContainerImage.fromRegistry("augurproject/chainlink-credential-generator:latest"),
      logging: logDriver,
    });
    credentialGenerator.addMountPoints({
      sourceVolume: "chainlinkVolume",
      containerPath: "/chainlink",
      readOnly: false,
    });

    node.addContainerDependencies({
      container: db,
      condition: ecs.ContainerDependencyCondition.HEALTHY,
    });
    node.addContainerDependencies({
      container: credentialGenerator,
      condition: ecs.ContainerDependencyCondition.SUCCESS,
    });
    node.addMountPoints({
      sourceVolume: "chainlinkVolume",
      containerPath: "/chainlink",
      readOnly: false,
    });

    const adapter = taskDefinition.addContainer("adapter", {
      environment: {
        PRIVATE_KEY: mySecret.secretValueFromJson("PRIVATE_KEY").toString(),
        RPC_URL: mySecret.secretValueFromJson("RPC_URL_HTTP").toString(),
        THERUNDOWN_API_KEY: mySecret.secretValueFromJson("THERUNDOWN_API_KEY").toString(),
        SPORTSDATAIO_MMA_STATS_API_KEY: mySecret.secretValueFromJson("SPORTSDATAIO_MMA_STATS_API_KEY").toString(),
      },
      essential: false,
      image: ecs.ContainerImage.fromRegistry("public.ecr.aws/s1q8t5o6/adapters/augur-adapter:latest"),
      logging: logDriver,
    });
    adapter.addPortMappings({
      containerPort: 8080,
    });

    const jobsCreator = taskDefinition.addContainer("jobs-creator", {
      environment: {
        CLIENT_NODE_URL: "http://localhost:6688",
        ADMIN_CREDENTIALS_FILE: "/chainlink/.api",
        BRIDGE_URL: "http://localhost:8080",
        CRYPTO_MARKET_FACTORY: findMarketFactory("Crypto"),
        MLB_MARKET_FACTORY: findMarketFactory("SportsLink"),
        MMA_MARKET_FACTORY: findMarketFactory("MMALink"),
        NBA_MARKET_FACTORY: findMarketFactory("SportsLink"),
      },
      essential: false,
      image: ecs.ContainerImage.fromRegistry("augurproject/chainlink-job-generator:latest"),
      logging: logDriver,
    });
    jobsCreator.addMountPoints({
      sourceVolume: "chainlinkVolume",
      containerPath: "/chainlink",
      readOnly: false,
    });
    jobsCreator.addContainerDependencies({
      container: node,
      condition: ecs.ContainerDependencyCondition.HEALTHY,
    });

    //Security Groups
    const securityGroup = new ec2.SecurityGroup(this, "chainlinkNodeSecurityGroup", {
      allowAllOutbound: true,
      securityGroupName: "chainlinkNodeSecurityGroup",
      vpc: vpc,
    });
    securityGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(chainlinkDefaultPort));

    // Fargate Services
    const service = new ecs.FargateService(this, "chainlinkService", {
      cluster: cluster,
      taskDefinition,
      assignPublicIp: true,
      desiredCount: 1,
      securityGroup,
    });

    // ALB
    const httpApiInternalALB = new elbv2.ApplicationLoadBalancer(this, "httpapiInternalALB", {
      vpc: vpc,
      internetFacing: true,
    });

    // ALB Listener
    this.httpApiListener = httpApiInternalALB.addListener("httpapiListener", {
      port: 80,
      // Default Target Group
      defaultAction: elbv2.ListenerAction.fixedResponse(200),
    });

    // Target Groups
    this.httpApiListener.addTargets("serviceTargetGroup", {
      port: chainlinkDefaultPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      priority: 1,
      healthCheck: {
        path: "/",
        interval: cdk.Duration.seconds(300),
        timeout: cdk.Duration.seconds(3),
      },
      targets: [service],
      pathPattern: "/*",
    });

    //VPC Link
    this.httpVpcLink = new cdk.CfnResource(this, "HttpVpcLink", {
      type: "AWS::ApiGatewayV2::VpcLink",
      properties: {
        Name: "http-api-vpclink",
        SubnetIds: vpc.privateSubnets.map((m) => m.subnetId),
      },
    });
  }
}
