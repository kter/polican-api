import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

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
    });

    // DynamoDBをデータソースとしてAppSyncに追加
    const dataSource = api.addDynamoDbDataSource('MyDynamoDbDataSource', table);

    // リゾルバの設定（クエリ例）
    dataSource.createResolver('GetItemResolver', {
      typeName: 'Query', // スキーマ内のQueryタイプ
      fieldName: 'getItem', // スキーマで定義されたフィールド
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "GetItem",
          "key": {
            "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // リゾルバの設定（ミューテーション例）
    dataSource.createResolver('PutItemResolver', {
      typeName: 'Mutation', // スキーマ内のMutationタイプ
      fieldName: 'putItem', // スキーマで定義されたフィールド
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition('id').auto(),
        appsync.Values.projecting()
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
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