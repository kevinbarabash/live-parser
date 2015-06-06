var esprima = require('esprima');
var estraverse = require('estraverse');
var escodegen = require('escodegen');

var editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.getSession().setMode("ace/mode/javascript");


var xhr = new XMLHttpRequest();
xhr.open('GET', '../samples/slider_test.js', false);
xhr.send();

var code = xhr.response;

editor.setValue(code, -1);

var esprimaOptions = {
    loc: true,
    range: true,
    tokens: true,
    comment: true
};

var escodegenOptions = {
    comment: true,
    sourceCode: code,
    format: {
        preserveBlankLines: true
    }
};

var ast = esprima.parse(code, esprimaOptions);

//estraverse.traverse(ast, {
//    enter: function(node, parent) {
//        node.parent = parent;
//    }
//});

self.esprima = esprima;

var shouldWalk = function(node, cursorPosition) {
    var loc = node.loc;
    var line = cursorPosition.row;
    var column = cursorPosition.column;
    if (line >= loc.start.line && line <= loc.end.line) {
        if (line === loc.start.line && column < loc.start.column) {
            return false;
        }
        if (line === loc.end.line && column > loc.end.column) {
            return false;
        }
    } else {
        return false;
    }
    return true;
};

var isStatement = function (node) {
    return node.type.indexOf("Statement") !== -1;
};

var isDeclaration = function (node) {
    return node.type.indexOf("Declaration") !== -1;
};

var incrementLines = function(ast, afterLine, amount) {
    amount = amount || 1;

    var first = true;
    estraverse.traverse(ast, {
        enter: function(node) {
            var start = node.loc.start;
            var end = node.loc.end;
            if (start.line > afterLine) {
                if (first) {
                    first = false;
                    console.log("first: %o", node);
                }
                start.line += amount;
            }
            if (end.line > afterLine) {
                end.line += amount;
            }
        }
    });
};

editor.on('change', function(e) {
    console.log(e.data);
    var newLine = false;
    if (e.data.text === "\n") {
        newLine = true;
        // TODO: check if we're at the end of a line
    }

    var start = e.data.range.start;
    var cursorPosition = {
        column: start.column,
        row: start.row + 1      // b/c ace uses zero indexing
    };

    // TODO: differentiate inserts from deletes
    // TODO: handle inserting/deleting lines

    var cursorStatement = ast;
    estraverse.traverse(ast, {
        enter: function(node) {
            if (shouldWalk(node, cursorPosition)) {
                if (isStatement(node) || isDeclaration(node)) {
                    cursorStatement = node;
                }
            } else {
                this.skip();
            }
        }
    });
    //console.log(cursorStatement);
    //console.log(escodegen.generate(cursorStatement));

    // convert back to zero-indexing
    var startLine = cursorStatement.loc.start.line - 1;
    var endLine = cursorStatement.loc.end.line - 1;
    var rows = editor.getSession().getLines(startLine, endLine);

    // trim first/last rows as necessary
    var startColumn = cursorStatement.loc.start.column;
    var endColumn = cursorStatement.loc.end.column;

    console.log("startCol = " + startColumn + ", endCol = " + endColumn);
    if (startLine === endLine) {
        rows[0] = rows[0].substring(startColumn, endColumn);
    } else {
        rows[0] = rows[0].substring(startColumn);
        rows[rows.length - 1] = rows[rows.length - 1].substring(0, endColumn);
    }

    var code = rows.join("\n");
    console.log("code to replace: %s", code);

    if (newLine) {
        incrementLines(ast, start.row + 1);
    } else {
        try {
            var sub_ast = esprima.parse(code, esprimaOptions);
        } catch (e) {
            console.log("parse error");
            return;
        }

        var replacementStatement = sub_ast.body[0];

        if (replacementStatement.type === "BlockStatement") {
            replacementStatement.loc.start.column = startColumn;
            replacementStatement.loc.end.column = endColumn;
        }
        // TODO: figure out how to handle expression statements where
        // the endColumn changes as we insert chars

        // only continue if the edit changed
        // TODO compare against before/after sub_ast to avoid unnecessary updates
        console.log("replacement code: %s", escodegen.generate(sub_ast, escodegenOptions));
        console.log("replacement statement: %o", replacementStatement);

        // shift the line numbers so that they appear in the correct location
        estraverse.traverse(replacementStatement, {
            enter: function (node) {
                node.loc.start.line += startLine;
                node.loc.end.line += startLine;
            }
        });

        // find the node we want to replace and replace it with the new statement
        estraverse.replace(ast, {
            enter: function(node) {
                if (shouldWalk(node, cursorPosition)) {
                    if (isStatement(node) || isDeclaration(node)) {
                        if (node == cursorStatement) {
                            return replacementStatement;
                        }
                    }
                } else {
                    this.skip();
                }
            }
        });

        // print out the code to double check that nothing changed except for the
        // expected change
        // we can use this for fuzz testing... diff the before/after text
        console.log(escodegen.generate(ast, escodegenOptions));
    }
});
