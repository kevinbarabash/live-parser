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

var ast = esprima.parse(code, {
    loc: true
});
//console.log(ast);


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

editor.on('change', function(e) {
    console.log(e.data);
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

    console.log(cursorStatement);

    // convert back to zero-indexing
    var startLine = cursorStatement.loc.start.line - 1;
    var endLine = cursorStatement.loc.end.line - 1;
    var rows = editor.getSession().getLines(startLine, endLine);

    var code = rows.join("\n");

    var sub_ast = esprima.parse(code, {
        loc: true
    });

    console.log(sub_ast);

    var replacementStatement = sub_ast.body[0];

    console.log(startLine);

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
    console.log(escodegen.generate(ast));
});
