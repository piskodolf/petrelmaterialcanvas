import type { Node, Edge } from '@xyflow/react';
import type { SubprocessItem } from '../contexts/MaterialContext';

interface Issue {
  id: string;
  type: 'izziv' | 'odpadek' | 'vprasanje';
  text: string;
}

const mapConnectionType = (type?: string): string => {
  switch (type) {
    case 'flow': return 'Naslednja aktivnost';
    case 'movement': return 'Premik';
    case 'delivery': return 'Dobava';
    case 'core': return 'Jedrni proces';
    case 'supply': return 'Stranska dobava';
    default: return 'Premik';
  }
};

export const exportToWord = (nodes: Node[], edges: Edge[], savedSubprocesses: SubprocessItem[]) => {
  const departments = nodes.filter(n => n.type === 'department');
  const processes = nodes.filter(n => n.type === 'process');
  const storages = nodes.filter(n => n.type === 'storage');

  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Poročilo o toku materiala</title>
<style>
  body {
    font-family: 'Calibri', 'Arial', sans-serif;
    color: #1e293b;
    line-height: 1.5;
    margin: 40px;
  }
  h1 {
    color: #1e3a8a;
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 8px;
    font-size: 24pt;
    margin-bottom: 20pt;
  }
  h2 {
    color: #1e40af;
    border-bottom: 1px solid #93c5fd;
    padding-bottom: 4px;
    margin-top: 30pt;
    margin-bottom: 12pt;
    font-size: 18pt;
  }
  h3 {
    color: #0f172a;
    margin-top: 20pt;
    margin-bottom: 8pt;
    font-size: 14pt;
    background-color: #f8fafc;
    padding: 6px 10px;
    border-left: 4px solid #3b82f6;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    margin-bottom: 20px;
  }
  th {
    background-color: #f1f5f9;
    color: #1e293b;
    font-weight: bold;
    text-align: left;
    border: 1px solid #cbd5e1;
    padding: 8px;
    font-size: 10pt;
  }
  td {
    border: 1px solid #cbd5e1;
    padding: 8px;
    vertical-align: top;
    font-size: 10pt;
  }
  ul {
    margin-top: 4px;
    margin-bottom: 10px;
    padding-left: 20px;
  }
  li {
    margin-bottom: 4px;
    font-size: 10pt;
  }
  .meta-table td {
    border: none;
    padding: 4px 8px;
  }
  .meta-label {
    font-weight: bold;
    color: #475569;
    width: 120px;
  }
  .badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 8.5pt;
    font-weight: bold;
    display: inline-block;
  }
  .badge-izziv {
    background-color: #fef3c7;
    color: #d97706;
    border: 1px solid #fde68a;
  }
  .badge-odpadek {
    background-color: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
  .badge-vprasanje {
    background-color: #dbeafe;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }
  .empty {
    font-style: italic;
    color: #64748b;
    font-size: 9.5pt;
  }
  .section-title {
    font-weight: bold;
    color: #475569;
    margin-top: 10pt;
    margin-bottom: 4pt;
    font-size: 10.5pt;
  }
</style>
</head>
<body>
  <h1>Poročilo o toku materiala</h1>
  <p>Generirano dne: ${new Date().toLocaleDateString('sl')} ob ${new Date().toLocaleTimeString('sl')}</p>
  `;

  const renderIssuesHTML = (elementIssues?: Issue[]) => {
    if (!elementIssues || elementIssues.length === 0) {
      return '<p class="empty">Ni zabeleženih izzivov, odpadkov ali vprašanj.</p>';
    }

    let out = '<ul>';
    elementIssues.forEach(issue => {
      let badgeClass = 'badge-izziv';
      let typeLabel = 'Izziv';
      if (issue.type === 'odpadek') {
        badgeClass = 'badge-odpadek';
        typeLabel = 'Odpadek';
      } else if (issue.type === 'vprasanje') {
        badgeClass = 'badge-vprasanje';
        typeLabel = 'Vprašanje';
      }
      out += `<li><span class="badge ${badgeClass}">${typeLabel}</span> ${issue.text}</li>`;
    });
    out += '</ul>';
    return out;
  };

  const renderConnectionsHTML = (nodeId: string, type: 'in' | 'out') => {
    const relevantEdges = edges.filter(e => type === 'in' ? e.target === nodeId : e.source === nodeId);
    if (relevantEdges.length === 0) {
      return `<p class="empty">Ni ${type === 'in' ? 'vhodnih' : 'izhodnih'} povezav.</p>`;
    }

    let out = '<table>';
    out += `
      <thead>
        <tr>
          <th>${type === 'in' ? 'Vir (Od kod)' : 'Cilj (Kam)'}</th>
          <th>Material / Polizdelek</th>
          <th>Tip povezave</th>
          <th>Premikalo</th>
          <th>Izvajalec</th>
          <th>Sprožilec</th>
          <th>Težave / Vprašanja</th>
        </tr>
      </thead>
      <tbody>
    `;

    relevantEdges.forEach(e => {
      const otherNodeId = type === 'in' ? e.source : e.target;
      const otherNode = nodes.find(n => n.id === otherNodeId);
      const otherLabel = otherNode?.data?.label as string || 'Neznano';

      const matUrl = e.data?.materialUrl as string || '';
      const materialLabel = matUrl.startsWith('text:') ? matUrl.substring(5) : (matUrl ? 'Slikovni material' : 'Brez materiala');

      const connType = mapConnectionType(e.data?.connectionType as string);
      const tool = e.data?.tool as string || '/';
      const performer = e.data?.performer as string || '/';
      const trigger = e.data?.trigger as string || '/';

      const edgeIssues = (e.data?.issues as Issue[]) || [];
      let issuesSummary = '/';
      if (edgeIssues.length > 0) {
        issuesSummary = edgeIssues.map(i => {
          const prefix = i.type === 'izziv' ? '[Izziv]' : i.type === 'odpadek' ? '[Odpadek]' : '[Vprašanje]';
          return `${prefix} ${i.text}`;
        }).join(', ');
      }

      out += `
        <tr>
          <td>${otherLabel}</td>
          <td>${materialLabel}</td>
          <td>${connType}</td>
          <td>${tool}</td>
          <td>${performer}</td>
          <td>${trigger}</td>
          <td>${issuesSummary}</td>
        </tr>
      `;
    });

    out += '</tbody></table>';
    return out;
  };

  const getDeptChildren = (deptId: string | null) => {
    return {
      processes: processes.filter(p => p.parentId === deptId),
      storages: storages.filter(s => s.parentId === deptId)
    };
  };

  const renderDepartmentSectionHTML = (deptName: string, deptId: string | null) => {
    const { processes: deptProcesses, storages: deptStorages } = getDeptChildren(deptId);
    if (deptProcesses.length === 0 && deptStorages.length === 0) return '';

    let out = `<h2>Oddelek: ${deptName}</h2>`;

    if (deptProcesses.length > 0) {
      out += '<h3>Procesi</h3>';
      deptProcesses.forEach(p => {
        const label = p.data?.label as string || 'Neimenovan proces';
        const equipment = p.data?.equipment as string || '/';
        const performer = p.data?.performer as string || '/';
        const desc = p.data?.description as string || '/';
        const subId = p.data?.subprocess as string;
        const sub = savedSubprocesses.find(s => s.id === subId);
        const subName = sub ? sub.name : '/';

        out += `
          <div style="margin-left: 10px; margin-bottom: 24px; page-break-inside: avoid;">
            <h4 style="margin-top: 10px; margin-bottom: 6px; font-size: 12pt; color: #1e3a8a;">${label}</h4>
            
            <table class="meta-table" style="margin-bottom: 10px;">
              <tr>
                <td class="meta-label">Delovno sredstvo:</td>
                <td>${equipment}</td>
                <td class="meta-label">Subproces:</td>
                <td>${subName}</td>
              </tr>
              <tr>
                <td class="meta-label">Izvajalec:</td>
                <td>${performer}</td>
                <td class="meta-label">Opis:</td>
                <td>${desc}</td>
              </tr>
            </table>

            <div class="section-title">Vhodni tokovi</div>
            ${renderConnectionsHTML(p.id, 'in')}

            <div class="section-title">Izhodni tokovi</div>
            ${renderConnectionsHTML(p.id, 'out')}

            <div class="section-title">Izzivi, odpadki in vprašanja procesa</div>
            ${renderIssuesHTML((p.data?.issues as Issue[]))}
          </div>
        `;
      });
    }

    if (deptStorages.length > 0) {
      out += '<h3>Skladišča</h3>';
      deptStorages.forEach(s => {
        const label = s.data?.label as string || 'Neimenovano skladišče';
        const desc = s.data?.description as string || '/';
        const columns = (s.data?.columns as any[]) || [];

        let columnsHTML = '<p class="empty">Ni definiranih stolpcev.</p>';
        if (columns.length > 0) {
          columnsHTML = '<table><thead><tr><th>Stolpec (Polizdelek)</th><th>Kapaciteta</th><th>Trenutno zasedeno</th></tr></thead><tbody>';
          columns.forEach(col => {
            const matUrl = col.materialUrl as string || '';
            const materialLabel = matUrl.startsWith('text:') ? matUrl.substring(5) : (matUrl ? 'Slikovni material' : 'Prazen stolpec');
            const cap = col.capacity || 0;
            const itemsCount = col.items ? col.items.filter(Boolean).length : 0;
            columnsHTML += `<tr><td>${materialLabel}</td><td>${cap}</td><td>${itemsCount}</td></tr>`;
          });
          columnsHTML += '</tbody></table>';
        }

        out += `
          <div style="margin-left: 10px; margin-bottom: 24px; page-break-inside: avoid;">
            <h4 style="margin-top: 10px; margin-bottom: 6px; font-size: 12pt; color: #1e3a8a;">${label}</h4>
            <p><strong>Opis:</strong> ${desc}</p>
            
            <div class="section-title">Kapacitete in shranjeni materiali</div>
            ${columnsHTML}

            <div class="section-title">Izzivi, odpadki in vprašanja skladišča</div>
            ${renderIssuesHTML((s.data?.issues as Issue[]))}
          </div>
        `;
      });
    }

    return out;
  };

  departments.forEach(d => {
    const dLabel = d.data?.label as string || 'Neimenovan oddelek';
    html += renderDepartmentSectionHTML(dLabel, d.id);
  });

  const orphansHTML = renderDepartmentSectionHTML('Brez oddelka (Neuvrščeni elementi)', null);
  if (orphansHTML) {
    html += orphansHTML;
  }

  html += `
</body>
</html>
  `;

  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const docUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = docUrl;
  link.download = 'MaterialFlowCanvas_Porocilo.doc';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(docUrl);
};
