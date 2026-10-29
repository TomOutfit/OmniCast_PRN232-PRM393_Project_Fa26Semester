const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PANDOC = path.join(process.env.LOCALAPPDATA, 'Pandoc', 'pandoc.exe');

function unwrapMacro(content, macroName) {
  const prefix = '\\' + macroName + '{';
  let result = '';
  let i = 0;
  while (i < content.length) {
    if (content.substring(i, i + prefix.length) === prefix) {
      i += prefix.length;
      let depth = 1;
      let start = i;
      while (i < content.length && depth > 0) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') depth--;
        if (depth === 0) break;
        i++;
      }
      result += content.substring(start, i);
      i++; // skip final '}'
    } else {
      result += content[i];
      i++;
    }
  }
  return result;
}

function extractBi(content, lang) {
  let result = '';
  let i = 0;
  while (i < content.length) {
    if (content.slice(i, i + 4) === '\\bi{') {
      i += 3; // at '{'
      let depth = 0;
      let arg1Start = i + 1;
      let arg1End = -1;
      while (i < content.length) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') {
          depth--;
          if (depth === 0) {
            arg1End = i;
            break;
          }
        }
        i++;
      }

      i++;
      while (i < content.length && /\s/.test(content[i])) i++;

      if (content[i] === '{') {
        let depth2 = 0;
        let arg2Start = i + 1;
        let arg2End = -1;
        while (i < content.length) {
          if (content[i] === '{') depth2++;
          else if (content[i] === '}') {
            depth2--;
            if (depth2 === 0) {
              arg2End = i;
              break;
            }
          }
          i++;
        }

        const vn = content.substring(arg1Start, arg1End);
        const en = content.substring(arg2Start, arg2End);
        result += lang === 'vi' ? vn : en;
        i++;
      } else {
        result += '\\bi{' + content.substring(arg1Start, arg1End) + '}';
      }
    } else {
      result += content[i];
      i++;
    }
  }
  return result;
}

function resolveInputs(filePath, baseDir, visited = new Set()) {
  const fullPath = path.resolve(baseDir, filePath.endsWith('.tex') ? filePath : filePath + '.tex');
  if (!fs.existsSync(fullPath)) {
    console.warn('File not found: ' + fullPath);
    return '';
  }
  if (visited.has(fullPath)) return '';
  visited.add(fullPath);

  let text = fs.readFileSync(fullPath, 'utf8');
  // Remove comments
  text = text.replace(/(^|[^\\])%.*$/gm, '$1');

  // Replace \input{filename}
  text = text.replace(/\\input\{([^}]+)\}/g, (match, inputName) => {
    if (inputName.includes('preamble') || inputName.includes('figures')) {
      return '';
    }
    return resolveInputs(inputName, path.dirname(fullPath), visited);
  });

  return text;
}

function buildDocx(reportDir, mainTex, outputDocx, lang) {
  console.log(`==> Preparing DOCX for ${mainTex} (${lang})...`);
  const baseDir = path.resolve(reportDir);
  let content = resolveInputs(mainTex, baseDir);

  // Extract bilingual text first
  content = extractBi(content, lang);

  // Unwrap \fitcol and \fitfull with proper brace balancing
  content = unwrapMacro(content, 'fitcol');
  content = unwrapMacro(content, 'fitfull');

  content = content.replace(/\\omnitag\{([^}]+)\}/g, '**$1**');
  content = content.replace(/\\code\{([^}]+)\}/g, '`$1`');
  content = content.replace(/\\filepath\{([^}]+)\}/g, '*$1*');

  // Strip tcolorbox, onecolumn, twocolumn for clean Word rendering
  content = content.replace(/\\begin\{tcolorbox\}(\[[^\]]*\])?/g, '\n\n');
  content = content.replace(/\\end\{tcolorbox\}/g, '\n\n');
  content = content.replace(/\\(onecolumn|twocolumn)/g, '');
  content = content.replace(/\\color\{[^}]+\}\\rule\{[^}]+\}\{[^}]+\}/g, '\n\n---\n\n');

  // Replace tikzpicture environments
  content = content.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '\n\n*(Sơ đồ kiến trúc TikZ đã được kết xuất trong bản PDF)*\n\n');

  // Fix figure paths so pandoc finds them
  content = content.replace(/\\includegraphics(\[[^\]]*\])?\{([^}]+)\}/g, (match, opts, imgPath) => {
    const resolvedPath = path.resolve(baseDir, imgPath).replace(/\\/g, '/');
    return `\\includegraphics{${resolvedPath}}`;
  });

  const tempTex = path.join(baseDir, `_temp_${lang}.tex`);
  fs.writeFileSync(tempTex, content, 'utf8');

  console.log(`==> Running Pandoc to generate ${path.basename(outputDocx)}...`);
  try {
    execSync(`"${PANDOC}" -s "${tempTex}" -o "${outputDocx}"`, { stdio: 'inherit' });
    console.log(`==> Successfully generated ${path.basename(outputDocx)}`);
  } catch (err) {
    console.error('Error running Pandoc:', err.message);
  } finally {
    if (fs.existsSync(tempTex)) fs.unlinkSync(tempTex);
  }
}

// Build 4 DOCX files
const REPORTS_ROOT = path.resolve(__dirname, '../../01_Reports');

const targets = [
  {
    dir: path.join(REPORTS_ROOT, 'PRN232/latex'),
    tex: 'main-vi.tex',
    out: path.join(REPORTS_ROOT, 'PRN232/PRN232_Report_VI.docx'),
    lang: 'vi'
  },
  {
    dir: path.join(REPORTS_ROOT, 'PRN232/latex'),
    tex: 'main-en.tex',
    out: path.join(REPORTS_ROOT, 'PRN232/PRN232_Report_EN.docx'),
    lang: 'en'
  },
  {
    dir: path.join(REPORTS_ROOT, 'PRM393/latex'),
    tex: 'main-vi.tex',
    out: path.join(REPORTS_ROOT, 'PRM393/PRM393_Report_VI.docx'),
    lang: 'vi'
  },
  {
    dir: path.join(REPORTS_ROOT, 'PRM393/latex'),
    tex: 'main-en.tex',
    out: path.join(REPORTS_ROOT, 'PRM393/PRM393_Report_EN.docx'),
    lang: 'en'
  }
];

for (const t of targets) {
  buildDocx(t.dir, t.tex, t.out, t.lang);
}
console.log('==> All 4 DOCX files generated successfully!');
