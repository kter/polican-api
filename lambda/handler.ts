export const handler = async (event: any) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
  
    const fieldName = event.info.fieldName;
  
    if (fieldName === 'getItem') {
      const { id } = event.arguments;
      return { id, name: `Item with ID ${id}` };
    }
  
    if (fieldName === 'putItem') {
      const { id, name } = event.arguments;
      return { id, name };
    }
  
    throw new Error(`Unknown fieldName: ${fieldName}`);
  };