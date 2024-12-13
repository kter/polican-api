#!/opt/homebrew/opt/node/bin/node
import * as cdk from 'aws-cdk-lib';
import { PolicanApiStack } from '../lib/polican-api-stack';

const app = new cdk.App();

// テスト環境用スタック
new PolicanApiStack(app, 'PolicanApiStack-Test', {
  env: { account: process.env.TEST_ACCOUNT, region: process.env.TEST_REGION },
});

// 本番環境用スタック
new PolicanApiStack(app, 'PolicanApiStack-Prod', {
  env: { account: process.env.PROD_ACCOUNT, region: process.env.PROD_REGION },
});