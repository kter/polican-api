const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

async function getItemFromDynamoDB(id: string) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME, // テーブル名を指定
    Key: {
      id: id,
    },
  };

  const result = await docClient.get(params).promise();
  return result.Item;
}

export const handler = async (event: any) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
  
    // 生年月日から年齢を計算する関数
    const calculateAge = (dateOfBirth: string): number => {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };
  
    const fieldName = event.info.fieldName;
  
    if (fieldName === 'getItem') {
      const { id } = event.arguments;
  
      // DynamoDBからアイテムを取得するロジックを追加
      const item = await getItemFromDynamoDB(id);
  
      if (!item) {
        throw new Error('Item not found.');
      }
  
      const age = item.dateOfBirth ? calculateAge(item.dateOfBirth) : null;
  
      return {
        id: item.id,
        name: item.name,
        dateOfBirth: item.dateOfBirth,
        partyId: item.partyId,
        birthplace: item.birthplace,
        candidacyRegion: item.candidacyRegion,
        electionDistrict: item.electionDistrict,
        age
      };
    }
  
    if (fieldName === 'putItem') {
      const { id, name, dateOfBirth } = event.arguments;
      return { id, name, dateOfBirth };
    }
  
    throw new Error(`Unknown fieldName: ${fieldName}`);
  };