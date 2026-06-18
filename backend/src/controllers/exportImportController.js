const db = require('../config/database');
const ExcelJS = require('exceljs');

const getTestCasesForExport = async (projectId) => {
  const result = await db.query(
    `SELECT tc.id, tc.title, tc.description, tc.priority, tc.type,
            tc.preconditions, tc.postconditions, tc.tags, tc.status,
            u1.username AS created_by, u2.username AS assigned_to,
            tc.created_at,
            COALESCE(
              json_agg(
                json_build_object('step_number', ts.step_number, 'action', ts.action, 'expected_result', ts.expected_result)
                ORDER BY ts.step_number
              ) FILTER (WHERE ts.id IS NOT NULL), '[]'
            ) AS steps
     FROM test_cases tc
     LEFT JOIN users u1 ON tc.created_by = u1.id
     LEFT JOIN users u2 ON tc.assigned_to = u2.id
     LEFT JOIN test_steps ts ON tc.id = ts.test_case_id
     WHERE tc.project_id = $1
     GROUP BY tc.id, u1.username, u2.username
     ORDER BY tc.created_at`,
    [projectId]
  );
  return result.rows;
};

const exportCSV = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await getTestCasesForExport(projectId);

    const header = ['ID', 'Title', 'Description', 'Priority', 'Type', 'Preconditions', 'Postconditions', 'Tags', 'Status', 'Created By', 'Assigned To', 'Steps'];
    const csvRows = [header.join(',')];

    for (const r of rows) {
      const steps = r.steps.map(s => `${s.step_number}. ${s.action} => ${s.expected_result}`).join(' | ');
      const values = [
        r.id,
        `"${(r.title || '').replace(/"/g, '""')}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        r.priority,
        r.type,
        `"${(r.preconditions || '').replace(/"/g, '""')}"`,
        `"${(r.postconditions || '').replace(/"/g, '""')}"`,
        `"${(r.tags || []).join(';')}"`,
        r.status,
        r.created_by || '',
        r.assigned_to || '',
        `"${steps.replace(/"/g, '""')}"`,
      ];
      csvRows.push(values.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="test-cases.csv"');
    res.send(csvRows.join('\n'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Export failed' });
  }
};

const exportExcel = async (req, res) => {
  try {
    const { projectId } = req.params;
    const rows = await getTestCasesForExport(projectId);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'TCM System';
    const ws = wb.addWorksheet('Test Cases');

    ws.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Preconditions', key: 'preconditions', width: 30 },
      { header: 'Postconditions', key: 'postconditions', width: 30 },
      { header: 'Tags', key: 'tags', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created By', key: 'created_by', width: 18 },
      { header: 'Assigned To', key: 'assigned_to', width: 18 },
    ];

    // Style header row
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const r of rows) {
      ws.addRow({
        id: r.id,
        title: r.title,
        description: r.description || '',
        priority: r.priority,
        type: r.type,
        preconditions: r.preconditions || '',
        postconditions: r.postconditions || '',
        tags: (r.tags || []).join(', '),
        status: r.status,
        created_by: r.created_by || '',
        assigned_to: r.assigned_to || '',
      });
    }

    // Steps sheet
    const stepsWs = wb.addWorksheet('Test Steps');
    stepsWs.columns = [
      { header: 'Test Case ID', key: 'test_case_id', width: 38 },
      { header: 'Test Case Title', key: 'title', width: 40 },
      { header: 'Step #', key: 'step_number', width: 8 },
      { header: 'Action', key: 'action', width: 40 },
      { header: 'Expected Result', key: 'expected_result', width: 40 },
    ];
    stepsWs.getRow(1).font = { bold: true };
    stepsWs.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    stepsWs.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const r of rows) {
      for (const s of r.steps) {
        stepsWs.addRow({ test_case_id: r.id, title: r.title, ...s });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="test-cases.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Export failed' });
  }
};

const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
};

const importCSV = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const content = req.file.buffer.toString('utf8');
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ message: 'File is empty or has no data rows' });

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const titleIdx = headers.indexOf('title');
    const descIdx = headers.indexOf('description');
    const priorityIdx = headers.indexOf('priority');
    const typeIdx = headers.indexOf('type');
    const preIdx = headers.indexOf('preconditions');
    const postIdx = headers.indexOf('postconditions');
    const tagsIdx = headers.indexOf('tags');

    if (titleIdx === -1) return res.status(400).json({ message: 'CSV must have a "title" column' });

    const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
    const VALID_TYPES = ['functional', 'integration', 'regression', 'smoke', 'ui', 'api'];
    let imported = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const title = cols[titleIdx]?.trim();
      if (!title) continue;

      const priority = VALID_PRIORITIES.includes(cols[priorityIdx]?.toLowerCase()) ? cols[priorityIdx].toLowerCase() : 'medium';
      const type = VALID_TYPES.includes(cols[typeIdx]?.toLowerCase()) ? cols[typeIdx].toLowerCase() : 'functional';
      const tags = tagsIdx >= 0 ? cols[tagsIdx]?.split(';').map(t => t.trim()).filter(Boolean) : [];

      try {
        await db.query(
          `INSERT INTO test_cases (project_id, title, description, priority, type, preconditions, postconditions, tags, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            projectId,
            title,
            descIdx >= 0 ? cols[descIdx] || null : null,
            priority,
            type,
            preIdx >= 0 ? cols[preIdx] || null : null,
            postIdx >= 0 ? cols[postIdx] || null : null,
            tags,
            req.user.id,
          ]
        );
        imported++;
      } catch (e) {
        errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }

    res.json({ message: `Imported ${imported} test cases`, imported, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Import failed' });
  }
};

const importExcel = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.getWorksheet('Test Cases') || wb.worksheets[0];
    if (!ws) return res.status(400).json({ message: 'No worksheet found' });

    const headers = [];
    ws.getRow(1).eachCell(cell => headers.push(String(cell.value || '').toLowerCase().trim()));

    const col = (name) => headers.indexOf(name);
    const titleCol = col('title');
    if (titleCol === -1) return res.status(400).json({ message: 'Excel must have a "Title" column' });

    const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
    const VALID_TYPES = ['functional', 'integration', 'regression', 'smoke', 'ui', 'api'];
    let imported = 0;
    const errors = [];

    for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
      const row = ws.getRow(rowNum);
      const title = String(row.getCell(titleCol + 1).value || '').trim();
      if (!title) continue;

      const priorityVal = String(row.getCell(col('priority') + 1).value || '').toLowerCase();
      const typeVal = String(row.getCell(col('type') + 1).value || '').toLowerCase();
      const tagsRaw = String(row.getCell(col('tags') + 1).value || '');

      try {
        await db.query(
          `INSERT INTO test_cases (project_id, title, description, priority, type, preconditions, postconditions, tags, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            projectId,
            title,
            String(row.getCell(col('description') + 1).value || '') || null,
            VALID_PRIORITIES.includes(priorityVal) ? priorityVal : 'medium',
            VALID_TYPES.includes(typeVal) ? typeVal : 'functional',
            String(row.getCell(col('preconditions') + 1).value || '') || null,
            String(row.getCell(col('postconditions') + 1).value || '') || null,
            tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
            req.user.id,
          ]
        );
        imported++;
      } catch (e) {
        errors.push(`Row ${rowNum}: ${e.message}`);
      }
    }

    res.json({ message: `Imported ${imported} test cases`, imported, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Import failed' });
  }
};

module.exports = { exportCSV, exportExcel, importCSV, importExcel };
