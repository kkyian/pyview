let functions = {};

function parseScript(text) {
  const lines = text.split('\n');
  let currentFunc = null;
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('def ')) {
      const name = trimmed.match(/def (.+?)\(/)[1];
      currentFunc = name;
      functions[name] = [];
    } else if (currentFunc && trimmed) {
      // Preserve indentation for proper block handling
      functions[currentFunc].push(line);
    }
  }
}

function evalCondition(condition, vars) {
  let expr = condition.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (match) => {
    return vars.hasOwnProperty(match) ? JSON.stringify(vars[match]) : `"${match}"`;
  });
  expr = expr.replace("==", "===");
  try {
    return eval(expr);
  } catch {
    return false;
  }
}

function evalExpression(expr, vars) {
  let replaced = expr.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (match) => {
    return vars.hasOwnProperty(match) ? JSON.stringify(vars[match]) : `"${match}"`;
  });
  try {
    return eval(replaced);
  } catch {
    return expr.replace(/['"]/g, "");
  }
}

function get(id) {
  return document.getElementById(id).value;
}

function set(value) {
  document.getElementById("output").innerText = value;
}

function clear(id) {
  const el = document.getElementById(id);
  if (el.tagName === "INPUT") {
    el.value = "";
  } else {
    el.innerText = "";
  }
}

function print(value) {
  console.log(value);
}

function alertUser(value) {
  alert(value);
}

function style(id, prop, value) {
  document.getElementById(id).style[prop] = value;
}

function toggle(id) {
  const el = document.getElementById(id);
  el.style.display = (el.style.display === "none") ? "" : "none";
}

function show(id) {
  document.getElementById(id).style.display = "";
}

function hide(id) {
  document.getElementById(id).style.display = "none";
}

function append(id, text) {
  document.getElementById(id).innerText += text;
}

function executeLine(line, vars) {
  if (line.includes('=') && !line.startsWith('if ')) {
    const parts = line.split('=');
    const varName = parts[0].trim();
    const expr = parts[1].trim();
    if (expr.includes('+')) {
      const [left, right] = expr.split('+').map(x => x.trim());
      vars[varName] = (vars[left] || left.replace(/['"]/g, "")) + (vars[right] || right.replace(/['"]/g, ""));
    } else {
      vars[varName] = vars[expr] || expr.replace(/['"]/g, "");
    }
  } else if (line.startsWith('set(')) {
    const expr = line.slice(4, -1);
    set(evalExpression(expr, vars));
  } else if (line.startsWith('clear(')) {
    const id = line.slice(6, -1).replace(/['"]/g, "");
    clear(id);
  } else if (line.startsWith('print(')) {
    const expr = line.slice(6, -1);
    print(evalExpression(expr, vars));
  } else if (line.startsWith('alert(')) {
    const expr = line.slice(6, -1);
    alertUser(evalExpression(expr, vars));
  } else if (line.startsWith('style(')) {
    const [idExpr, propExpr, valExpr] = line.slice(6, -1).split(',').map(x => x.trim());
    const id = evalExpression(idExpr, vars);
    const prop = evalExpression(propExpr, vars);
    const val = evalExpression(valExpr, vars);
    style(id, prop, val);
  } else if (line.startsWith('toggle(')) {
    const id = line.slice(7, -1).replace(/['"]/g, "");
    toggle(id);
  } else if (line.startsWith('show(')) {
    const id = line.slice(5, -1).replace(/['"]/g, "");
    show(id);
  } else if (line.startsWith('hide(')) {
    const id = line.slice(5, -1).replace(/['"]/g, "");
    hide(id);
  } else if (line.startsWith('append(')) {
    const [idExpr, textExpr] = line.slice(7, -1).split(',').map(x => x.trim());
    append(evalExpression(idExpr, vars), evalExpression(textExpr, vars));
  }
}

function run(funcName) {
  const code = functions[funcName];
  if (!code) {
    console.error("Function not found:", funcName);
    return;
  }

  const vars = {};
  let i = 0;

  while (i < code.length) {
    const rawLine = code[i];
    const line = rawLine.trim();

    if (line.startsWith('if ')) {
      let condition = line.slice(3).trim();
      if (condition.endsWith(':')) {
        condition = condition.slice(0, -1).trim();
      }
      const condResult = evalCondition(condition, vars);
      i++;

      const ifLines = [];
      while (i < code.length && code[i].startsWith('    ') && !code[i].trim().startsWith('else')) {
        ifLines.push(code[i]);
        i++;
      }

      let elseLines = [];
      if (i < code.length && code[i].trim().startsWith('else')) {
        i++; // skip the else line
        while (i < code.length && code[i].startsWith('    ')) {
          elseLines.push(code[i]);
          i++;
        }
      }

      const linesToRun = condResult ? ifLines : elseLines;
      for (const l of linesToRun) {
        executeLine(l.trim(), vars);
      }
    } else {
      executeLine(line, vars);
      i++;
    }
  }
}

fetch("main.pview")
  .then(res => res.text())
  .then(parseScript)
  .catch(err => console.error("Error loading .pview", err));
