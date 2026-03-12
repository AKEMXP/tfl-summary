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

export async function suggestViewsForSummary(exampleAndInstruction, selectedTables) {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const suggestions = [];
  const inputLower = exampleAndInstruction.toLowerCase();
  const inputOriginal = exampleAndInstruction;
  
  // Extract literal filter values from the input (e.g., "M/WHITE", specific terms in quotes)
  const literalValues = [];
  
  // Look for quoted values
  const quotedMatches = inputOriginal.match(/["']([^"']+)["']/g);
  if (quotedMatches) {
    quotedMatches.forEach(m => literalValues.push(m.replace(/["']/g, '')));
  }
  
  // Look for uppercase patterns that might be codes (e.g., M/WHITE, TEAE)
  const uppercaseMatches = inputOriginal.match(/\b[A-Z][A-Z0-9\/]+\b/g);
  if (uppercaseMatches) {
    uppercaseMatches.forEach(m => {
      if (m.length >= 2 && !['AND', 'OR', 'THE', 'FOR', 'ALL', 'WHO', 'ARE'].includes(m)) {
        literalValues.push(m);
      }
    });
  }
  
  // Detect operation type
  const wantsList = /\b(list|enumerate|show all|all the)\b/i.test(inputOriginal);
  const wantsCount = /\b(count|number of|how many|total)\b/i.test(inputOriginal);
  const wantsGroupBy = /\b(by treatment|by group|per arm|each arm|group by)\b/i.test(inputOriginal);
  
  // Detect filter conditions
  const filterConditions = [];
  
  // Severity filters
  if (/\b(serious|severe|grade\s*[3-5])\b/i.test(inputOriginal)) {
    filterConditions.push({ 
      columnHints: ['severity', 'serious', 'grade', 'intensity'],
      value: 'Serious',
      keyword: inputOriginal.match(/\b(serious|severe|grade\s*[3-5])\b/i)?.[0]
    });
  }
  
  // Relationship filters
  if (/\b(treatment-related|drug-related|related)\b/i.test(inputOriginal)) {
    filterConditions.push({
      columnHints: ['relationship', 'related', 'causality'],
      value: 'Related',
      keyword: inputOriginal.match(/\b(treatment-related|drug-related|related)\b/i)?.[0]
    });
  }
  
  // Add literal values as potential filters
  literalValues.forEach(val => {
    filterConditions.push({
      columnHints: null, // Will search all columns for this value
      value: val,
      keyword: val,
      isLiteral: true
    });
  });
  
  // Detect target column for list/count (e.g., "preferred terms", "subject IDs")
  let targetColumn = null;
  const targetMatch = inputOriginal.match(/\b(list|count|enumerate)\s+(?:all\s+)?(?:the\s+)?([a-zA-Z\s]+?)(?:\s+for|\s+of|\s+where|$)/i);
  if (targetMatch) {
    targetColumn = targetMatch[2].trim().toLowerCase();
  }
  
  selectedTables.forEach(table => {
    const headers = table.rows?.[0] || [];
    const headersLower = headers.map(h => String(h).toLowerCase());
    const dataRows = table.rows?.slice(1) || [];
    const rowCount = dataRows.length;
    
    // Build a single combined view suggestion
    const combinedView = {
      filters: [],
      groupBy: [],
      aggregate: null,
      targetColumnIdx: null
    };
    
    // Find columns that match filter conditions
    filterConditions.forEach(condition => {
      if (condition.columnHints) {
        // Search by column name hints
        const colIdx = headersLower.findIndex(h => 
          condition.columnHints.some(hint => h.includes(hint))
        );
        if (colIdx >= 0) {
          combinedView.filters.push({
            columnIndex: colIdx,
            columnName: headers[colIdx],
            value: condition.value,
            keyword: condition.keyword
          });
        }
      } else if (condition.isLiteral) {
        // Search for literal value in data to find which column contains it
        for (let colIdx = 0; colIdx < headers.length; colIdx++) {
          const hasValue = dataRows.some(row => {
            const cellValue = String(row[colIdx] || '').toUpperCase();
            return cellValue.includes(condition.value.toUpperCase());
          });
          if (hasValue) {
            combinedView.filters.push({
              columnIndex: colIdx,
              columnName: headers[colIdx],
              value: condition.value,
              keyword: condition.keyword
            });
            break; // Only add once per literal value
          }
        }
      }
    });
    
    // Find target column for list/count
    if (targetColumn) {
      const targetIdx = headersLower.findIndex(h => 
        h.includes(targetColumn) || targetColumn.split(/\s+/).some(word => h.includes(word))
      );
      if (targetIdx >= 0) {
        combinedView.targetColumnIdx = targetIdx;
        combinedView.targetColumnName = headers[targetIdx];
      }
    }
    
    // If no specific target found, look for common target columns
    if (combinedView.targetColumnIdx === null) {
      const commonTargets = ['preferred term', 'pt', 'term', 'event', 'description'];
      const targetIdx = headersLower.findIndex(h => 
        commonTargets.some(t => h.includes(t))
      );
      if (targetIdx >= 0) {
        combinedView.targetColumnIdx = targetIdx;
        combinedView.targetColumnName = headers[targetIdx];
      }
    }
    
    // Set aggregate operation
    if (wantsList) {
      combinedView.aggregate = 'List';
    } else if (wantsCount) {
      combinedView.aggregate = 'Count';
    }
    
    // Build the view suggestion
    if (combinedView.filters.length > 0 || combinedView.aggregate) {
      const filterDescriptions = combinedView.filters.map(f => 
        `${f.columnName} = "${f.value}"`
      );
      
      let description = '';
      let reason = '';
      
      if (combinedView.filters.length > 0 && combinedView.aggregate && combinedView.targetColumnName) {
        description = `Filter (${filterDescriptions.join(' AND ')}), then ${combinedView.aggregate} "${combinedView.targetColumnName}"`;
        reason = `Based on your instruction to ${combinedView.aggregate.toLowerCase()} ${combinedView.targetColumnName || 'values'} with filters: ${filterDescriptions.join(', ')}`;
      } else if (combinedView.filters.length > 0 && combinedView.aggregate) {
        description = `Filter (${filterDescriptions.join(' AND ')}), then ${combinedView.aggregate} values`;
        reason = `Apply filters ${filterDescriptions.join(', ')} and ${combinedView.aggregate.toLowerCase()} the results`;
      } else if (combinedView.filters.length > 0) {
        description = `Filter: ${filterDescriptions.join(' AND ')}`;
        reason = `Filter the table based on conditions: ${filterDescriptions.join(', ')}`;
      } else if (combinedView.aggregate && combinedView.targetColumnName) {
        description = `${combinedView.aggregate} "${combinedView.targetColumnName}"`;
        reason = `${combinedView.aggregate} values in the ${combinedView.targetColumnName} column`;
      }
      
      suggestions.push({
        table: {
          name: table.name,
          sourceFile: table.sourceFile,
          uniqueKey: table.uniqueKey,
          isPrimary: table.isPrimary
        },
        rowCount,
        views: [{
          type: 'combined',
          description,
          reason,
          filters: combinedView.filters,
          aggregate: combinedView.aggregate,
          targetColumn: combinedView.targetColumnName,
          targetColumnIdx: combinedView.targetColumnIdx
        }]
      });
    }
  });
  
  const detectedOperations = [];
  if (filterConditions.length > 0) detectedOperations.push(`${filterConditions.length} filter(s)`);
  if (wantsList) detectedOperations.push('list operation');
  if (wantsCount) detectedOperations.push('count operation');
  if (wantsGroupBy) detectedOperations.push('group by');
  
  return {
    success: true,
    suggestions,
    analysis: detectedOperations.length > 0 
      ? `Detected: ${detectedOperations.join(', ')}. I've created a combined view suggestion.`
      : "I couldn't identify specific patterns. Try mentioning 'list', 'count', filter values, or column names."
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
