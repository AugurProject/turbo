import * as ts from "typescript";
import { EmitHint, SyntaxKind } from "typescript";
import * as fs from "fs";
import prettier from "prettier";

const printer = ts.createPrinter();

export function updateAddressConfig(addressFilePath: string, chainId: number, addresses: Record<string, string>) {
  const sourceFile = ts.createSourceFile(
    "addresses.ts",
    fs.readFileSync(addressFilePath, "utf8"),
    ts.ScriptTarget.Latest
  );

  const transformerFactory: ts.TransformerFactory<ts.Node> = (
    context: ts.TransformationContext
  ) => {
    return (rootNode) => {
      function addAddressToObject(node: ts.VariableDeclaration): ts.VariableDeclaration {
        const objectDef = node.getChildAt(4, sourceFile);
        if (ts.isObjectLiteralExpression(objectDef)) {
          return context.factory.createVariableDeclaration(
            node.name,
            node.exclamationToken,
            node.type,
            context.factory.createObjectLiteralExpression(
              [
                // Remove object with passed chainId if present.
                ...objectDef.properties.filter((node) => {
                  return node.name?.getText(sourceFile) !== `${chainId}`;
                }),
                context.factory.createPropertyAssignment(`${chainId}`,
                  ts.factory.createObjectLiteralExpression(
                    Object.entries(addresses).map(([key, addy]) => {
                      return context.factory.createPropertyAssignment(`${key}`, ts.factory.createStringLiteral(addy));
                    })
                  ))
              ]
            )
          );
        }

        return node;
      }

      function visit(node: ts.Node): ts.Node {
        if (
          ts.isSourceFile(node) ||
          ts.isVariableDeclarationList(node) ||
          node.kind == SyntaxKind.FirstStatement
        ) {
          return ts.visitEachChild(node, visit, context);
        }

        if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === "addresses") {
          return addAddressToObject(node);
        }

        return node;
      }

      return ts.visitNode(rootNode, visit);
    };
  };

  const transformationResult = ts.transform(sourceFile, [transformerFactory]);
  const output = printer.printNode(EmitHint.Unspecified, transformationResult.transformed[0], sourceFile);
  const formattedOutput = prettier.format(output, {
    parser: "babel-ts"
  });

  fs.writeFileSync(addressFilePath, formattedOutput);
}
