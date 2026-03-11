import { tableToPlainText } from './rtfParser';

const SIMULATED_DELAY = 2000;

export async function generateTableSummary(table, example, instruction, additionalTables = []) {
  const tableText = tableToPlainText(table);
  
  const additionalTablesText = additionalTables.map(t => ({
    name: t.name,
    sourceFile: t.sourceFile,
    content: tableToPlainText(t)
  }));
  
  const prompt = buildPrompt(tableText, table.name, example, instruction, additionalTablesText);
  
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
  
  const summary = generateMockSummary(table, instruction, additionalTables);
  
  return {
    success: true,
    summary,
    prompt,
    model: 'gpt-4 (simulated)',
    tokensUsed: Math.floor(Math.random() * 500) + 200 + (additionalTables.length * 100)
  };
}

function buildPrompt(tableText, tableName, example, instruction, additionalTables) {
  let prompt = `You are an expert at analyzing clinical trial data tables and generating concise summaries.

## Primary Table: ${tableName}
${tableText}
`;

  if (additionalTables.length > 0) {
    prompt += `\n## Additional Reference Tables:\n`;
    additionalTables.forEach((t, i) => {
      prompt += `\n### Reference Table ${i + 1}: ${t.name} (from ${t.sourceFile})\n${t.content}\n`;
    });
  }

  prompt += `
## Example Summary Format:
${example || 'No example provided'}

## Instructions:
${instruction || 'Generate a clear and concise summary of the table data.'}

Please generate a summary following the example format and instructions provided.`;

  return prompt;
}

function generateMockSummary(table, instruction, additionalTables = []) {
  const tableName = table.name || 'the table';
  const rowCount = table.rows?.length || 0;
  
  let summary = '';
  
  const summaryTemplates = [
    `Based on the analysis of ${tableName}, the data shows key findings across ${rowCount} data points. The primary endpoints demonstrate statistical significance with favorable outcomes observed in the treatment group compared to control.`,
    
    `Summary of ${tableName}: The table presents ${rowCount} rows of clinical data. Notable observations include consistent trends in the primary variables, with secondary endpoints showing expected variations within acceptable ranges.`,
    
    `${tableName} analysis reveals ${rowCount} entries with comprehensive demographic and efficacy data. The results indicate positive treatment effects with safety profiles consistent with previous studies.`
  ];
  
  const baseIndex = Math.floor(Math.random() * summaryTemplates.length);
  summary = summaryTemplates[baseIndex];
  
  if (additionalTables.length > 0) {
    const refNames = additionalTables.map(t => t.name).join(', ');
    summary += ` This analysis was cross-referenced with ${additionalTables.length} additional table(s) (${refNames}) to ensure comprehensive coverage of the clinical findings.`;
  }
  
  if (instruction && instruction.toLowerCase().includes('brief')) {
    summary = summary.split('.')[0] + '.';
  }
  
  if (instruction && instruction.toLowerCase().includes('detailed')) {
    summary += ` Additional analysis of subgroup populations confirms the overall findings. The statistical methodology employed ensures robust and reproducible results.`;
  }
  
  return summary;
}

export async function updateSummaryNumbers(originalSummary, table) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  let updated = originalSummary;
  const numbers = originalSummary.match(/\d+/g) || [];
  
  numbers.forEach(num => {
    const variation = Math.floor(Math.random() * 5) - 2;
    const newNum = Math.max(1, parseInt(num) + variation);
    updated = updated.replace(num, newNum.toString());
  });
  
  return {
    success: true,
    summary: updated
  };
}

export async function rewriteSummary(table, originalSummary, instruction) {
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
  
  const rewritten = `[Rewritten] ${generateMockSummary(table, instruction)} This updated summary incorporates the latest data while maintaining consistency with the original analysis framework.`;
  
  return {
    success: true,
    summary: rewritten
  };
}

export async function suggestTablesForSummary(exampleSummary, primaryTable, availableTables) {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const suggestions = [];
  const exampleLower = exampleSummary.toLowerCase();
  
  const keywords = {
    adverse: ['adverse', 'ae', 'safety', 'event', 'teae'],
    demographic: ['demographic', 'baseline', 'age', 'gender', 'population'],
    efficacy: ['efficacy', 'endpoint', 'primary', 'secondary', 'outcome'],
    disposition: ['disposition', 'discontinue', 'complete', 'withdraw'],
    vital: ['vital', 'blood pressure', 'heart rate', 'temperature'],
    lab: ['laboratory', 'lab', 'hematology', 'chemistry', 'urinalysis'],
    conmed: ['concomitant', 'medication', 'prior', 'drug'],
    exposure: ['exposure', 'dose', 'duration', 'compliance']
  };
  
  const matchedCategories = [];
  Object.entries(keywords).forEach(([category, terms]) => {
    if (terms.some(term => exampleLower.includes(term))) {
      matchedCategories.push(category);
    }
  });
  
  availableTables.forEach(table => {
    if (table.id === primaryTable.id && table.sourceFile === primaryTable.sourceFile) {
      return;
    }
    
    const tableLower = table.name.toLowerCase();
    let relevanceScore = 0;
    let matchedKeywords = [];
    
    matchedCategories.forEach(category => {
      keywords[category].forEach(term => {
        if (tableLower.includes(term)) {
          relevanceScore += 2;
          if (!matchedKeywords.includes(term)) {
            matchedKeywords.push(term);
          }
        }
      });
    });
    
    Object.values(keywords).flat().forEach(term => {
      if (exampleLower.includes(term) && tableLower.includes(term)) {
        relevanceScore += 1;
        if (!matchedKeywords.includes(term)) {
          matchedKeywords.push(term);
        }
      }
    });
    
    if (relevanceScore > 0) {
      const rowCount = (table.rows?.length || 1) - 1;
      let suggestedFilter = null;
      
      if (rowCount > 100) {
        suggestedFilter = generateSuggestedFilter(table, exampleLower);
      }
      
      suggestions.push({
        table,
        relevanceScore,
        matchedKeywords,
        suggestedFilter,
        reason: generateSuggestionReason(table, matchedKeywords, exampleSummary)
      });
    }
  });
  
  suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return {
    success: true,
    suggestions: suggestions.slice(0, 5),
    analysis: generateAnalysisSummary(exampleSummary, matchedCategories)
  };
}

function generateSuggestedFilter(table, exampleLower) {
  const headers = table.rows?.[0] || [];
  const filters = {};
  
  const filterHints = [
    { keywords: ['serious', 'severe'], columns: ['severity', 'serious', 'grade'], value: 'Yes' },
    { keywords: ['treatment-related', 'drug-related'], columns: ['relationship', 'related', 'causality'], value: 'Related' },
    { keywords: ['discontinue', 'withdraw'], columns: ['action', 'outcome', 'result'], value: 'Discontinued' },
    { keywords: ['primary', 'main'], columns: ['category', 'type', 'class'], value: '' },
  ];
  
  filterHints.forEach(hint => {
    if (hint.keywords.some(k => exampleLower.includes(k))) {
      headers.forEach((header, idx) => {
        const headerLower = String(header).toLowerCase();
        if (hint.columns.some(col => headerLower.includes(col))) {
          filters[idx] = hint.value || 'filter suggested';
        }
      });
    }
  });
  
  if (Object.keys(filters).length === 0 && headers.length > 0) {
    for (let i = 0; i < headers.length; i++) {
      const headerLower = String(headers[i]).toLowerCase();
      if (headerLower.includes('subject') || headerLower.includes('patient') || headerLower.includes('id')) {
        continue;
      }
      if (headerLower.includes('category') || headerLower.includes('type') || headerLower.includes('class') || headerLower.includes('term')) {
        filters[i] = '';
        break;
      }
    }
  }
  
  return Object.keys(filters).length > 0 ? filters : null;
}

function generateSuggestionReason(table, matchedKeywords, exampleSummary) {
  const tableName = table.name;
  const keywordList = matchedKeywords.slice(0, 3).join(', ');
  
  const reasons = [
    `This table contains ${keywordList} data that appears relevant to your example summary.`,
    `The example mentions ${keywordList}, which aligns with the content of "${tableName}".`,
    `Based on your example's focus on ${keywordList}, this table could provide supporting context.`,
    `"${tableName}" includes ${keywordList} information referenced in your summary pattern.`
  ];
  
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function generateAnalysisSummary(exampleSummary, matchedCategories) {
  if (matchedCategories.length === 0) {
    return "I analyzed your example but couldn't identify specific data categories. Consider adding more context-specific tables manually.";
  }
  
  const categoryNames = {
    adverse: 'adverse events',
    demographic: 'demographics',
    efficacy: 'efficacy endpoints',
    disposition: 'patient disposition',
    vital: 'vital signs',
    lab: 'laboratory values',
    conmed: 'concomitant medications',
    exposure: 'drug exposure'
  };
  
  const names = matchedCategories.map(c => categoryNames[c] || c).join(', ');
  return `Based on your example summary, I identified references to: ${names}. I've suggested tables that could provide relevant supporting data.`;
}
