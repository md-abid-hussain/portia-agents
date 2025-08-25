/**
 * Parses API response result into a readable content string
 */
export const parseResponseContent = (result: any, includeSummary:boolean = false): string => {
  if (typeof result === 'string') {
    return result;
  }

  if (result && typeof result === 'object') {

    console.log(result)

    // If result is an object, try to extract meaningful content
    if (includeSummary && 'summary' in result && result.summary) {
      let content = result.summary;
      // If there's also a value, append it
      if ('value' in result && result.value !== undefined) {
        content = `${content}\n\n**Result:** ${result.value}`;
      }
      return content;
    }

    if ('value' in result && result.value !== undefined) {
      return result.value;
    }

    // Fallback to formatted JSON
    return `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
  }

  return 'No response received';
};