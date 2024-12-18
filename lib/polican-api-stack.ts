import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';

export class PolicanApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // GraphQL APIの作成
    const api = new appsync.GraphqlApi(this, 'MyGraphqlApi', {
      name: 'my-appsync-api',
      schema: appsync.SchemaFile.fromAsset('graphql/schema.graphql'), // スキーマファイルを指定
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)), // APIキーの有効期限
          },
        },
      },
    });

    // DynamoDBテーブルの作成
    const table = new dynamodb.Table(this, 'MyDynamoDBTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // オンデマンドに設定
    });

    // DynamoDBをデータソースとしてAppSyncに追加
    const dataSource = api.addDynamoDbDataSource('MyDynamoDbDataSource', table);

    // リゾルバの設定（ミューテーション: PutItem）
    dataSource.createResolver('PutItemResolver', {
      typeName: 'Mutation',
      fieldName: 'putItem',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "key": {
            "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
          },
          "attributeValues": {
            "name": $util.dynamodb.toDynamoDBJson($ctx.args.name),
            "dateOfBirth": $util.dynamodb.toDynamoDBJson($ctx.args.dateOfBirth)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // NodejsFunctionを使用してLambda関数を作成
    const ageResolverFunction = new lambdaNodejs.NodejsFunction(this, 'AgeResolverFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/handler.ts', // エントリーポイントを指定
      handler: 'handler', // エクスポ���トされた関数名
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName, // 環境変数を設定
      },
      bundling: {
        externalModules: [],
      },
    });

    // ageResolverFunctionにtableの読み取り権限を与える
    table.grantReadData(ageResolverFunction);

    // LambdaをAppSyncデータソースとして追加
    const lambdaDataSource = api.addLambdaDataSource('AgeLambdaDataSource', ageResolverFunction);

    // リゾルバの設定（クエリ: getItem with Lambda）
    lambdaDataSource.createResolver('GetItemLambdaResolver', {
      typeName: 'Query',
      fieldName: 'getItem',
    });

    // 出力: GraphQLエンドポイント
    new cdk.CfnOutput(this, 'GraphQlApiUrl', {
      value: api.graphqlUrl,
    });

    // 出力: APIキー
    new cdk.CfnOutput(this, 'GraphQlApiKey', {
      value: api.apiKey || '',
    });
  }
}