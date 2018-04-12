'use strict';

// See https://github.com/Microsoft/vscode/tree/master/extensions/markdown/src

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from "fs";
//import { slugify } from './util';

const officialExt = vscode.extensions.getExtension("vscode.markdown-language-features");

const tocModule = require(path.join(officialExt.extensionPath, 'out', 'tableOfContentsProvider'));
const TocProvider = tocModule.TableOfContentsProvider;
const Slug = tocModule.Slug;
const Plugin = require('markdown-it-regexp');
const hljs = require(path.join(officialExt.extensionPath, 'node_modules', 'highlight.js'));
const mdnh = require(path.join(officialExt.extensionPath, 'node_modules', 'markdown-it-named-headers'));
function hr_section(tokens, idx, options, env, self) {
    var token = tokens[idx];
    var result = '</section>';
    var classes = 'slide';
    if (token.attrs) {
        for (var i = 0; i < token.attrs.length; i++) {
            var tokenAttr = token.attrs[i];
            if (tokenAttr.length == 2 && tokenAttr[0] == 'class') {
                classes = classes + ' ' + tokenAttr[1];
            }
        }
    }
    result = result + '<section class="' + classes + '">';
    return result;
};
const md = require(path.join(officialExt.extensionPath, 'node_modules', 'markdown-it'))({
    html: true,
    highlight: (str: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<pre class="hljs"><code><div>${hljs.highlight(lang, str, true).value}</div></code></pre>`;
            } catch (error) { }
        }
        // return `<pre class="hljs"><code><div>${this.engine.utils.escapeHtml(str)}</div></code></pre>`;
        return str;
    }
})
    .use(require('markdown-it-sup'))
    .use(require('markdown-it-sub'))
    .use(require('markdown-it-decorate'))
    .use(Plugin(
        /\:fa-([\w\-]+)\:/,
        function (match, utils) {
            return '<span class="fa fa-' + utils.escape(match[1]) + '"></span>';
        }
    ));
md.renderer.rules['hr'] = hr_section;


let thisContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
    thisContext = context;
    context.subscriptions.push(vscode.commands.registerCommand('markdown.extension.printToHtml', () => { print('html'); }));
}

export function deactivate() { }

function print(type: string) {
    let editor = vscode.window.activeTextEditor;
    let doc = editor.document;

    if (!editor || doc.languageId != 'markdown') {
        vscode.window.showErrorMessage('No valid Markdown file');
        return;
    }

    if (doc.isDirty || doc.isUntitled) {
        doc.save();
    }

    let statusBarMsg = vscode.window.setStatusBarMessage(`Printing '${path.basename(doc.fileName)}' to ${type.toUpperCase()} ...`, 1000);

    /**
     * Modified from <https://github.com/Microsoft/vscode/tree/master/extensions/markdown>
     * src/previewContentProvider MDDocumentContentProvider provideTextDocumentContent
     */
    let outPath = doc.fileName.replace(/\.(md|MD|markdown)$/, `.${type}`);
    outPath = outPath.replace(/^([cdefghij]):\\/, function (match, p1: string) {
        return `${p1.toUpperCase()}:\\`; // Capitalize drive letter
    });

    let body = render(doc.getText(), vscode.workspace.getConfiguration('markdown.preview', doc.uri));
    var trimmed = body.trim();
    if (trimmed.indexOf('<!--{.darkSlide}-->') === 0) {
        body = '<section class=\"slide darkSlide\">' + body + '</section>';
    } else if (trimmed.indexOf('<!--{.greenSlide}-->') === 0) {
        body = '<section class=\"slide greenSlide\">' + body + '</section>';
    } else if (trimmed.indexOf('<!--{.darkBlueSlide}-->') === 0) {
        body = '<section class=\"slide darkBlueSlide\">' + body + '</section>';
    } else if (trimmed.indexOf('<!--{.redSlide}-->') === 0) {
        body = '<section class=\"slide redSlide\">' + body + '</section>';
    } else if (trimmed.indexOf('<!--{.yellowSlide}-->') === 0) {
        body = '<section class=\"slide yellowSlide\">' + body + '</section>';
    } else {
        body = '<section class=\"slide\">' + body + '</section>';
    }
    if (vscode.workspace.getConfiguration("markdown.extension.print", doc.uri).get<boolean>("absoluteImgPath")) {
        body = body.replace(/(<img[^>]+src=")([^"]+)("[^>]*>)/g, function (match, p1, p2, p3) { // Match '<img...src="..."...>'
            return `${p1}${fixHref(doc.uri, p2)}${p3}`;
        });
    }

    let styleSheets = ['./screen-4x3.inline.css', './fonts/roboto_light_macroman/stylesheet.inline.css', './fontawesome/css/fontawesome-all.inline2.css', './agate.css'].map(s => getMediaPath(s))
        .concat(getCustomStyleSheets(doc.uri));

    let scripts = ['./shower.min.js'].map(s => getMediaPath(s));

    let html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
	    <meta http-equiv="x-ua-compatible" content="ie=edge">
	    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
        ${styleSheets.map(css => wrapWithStyleTag(css)).join('\n')}
    </head>
    <body class="shower list">
        ${body}
        <div class="progress"></div>
    </body>
    ${scripts.map(js => wrapWithScriptTag(js)).join('\n')}
    </html>`;

    switch (type) {
        case 'html':
            fs.writeFile(outPath, html, 'utf-8', function (err) {
                if (err) { console.log(err); }
            });
            break;
        case 'pdf':
            break;
    }
}

function render(text: string, config: vscode.WorkspaceConfiguration) {
    md.set({
        breaks: config.get<boolean>('breaks', false),
        linkify: config.get<boolean>('linkify', true)
    });
    return md.render(text);
}

function getMediaPath(mediaFile: string): string {
    return thisContext.asAbsolutePath(mediaFile);
}

function wrapWithStyleTag(src: string) {
    let uri = vscode.Uri.parse(src);
    if (uri.scheme.includes('http')) {
        return `<link rel="stylesheet" href="${src}">`;
    } else {
        return `<style>\n${readCss(src)}\n</style>`;
    }
}

function wrapWithScriptTag(src: string) {
    let uri = vscode.Uri.parse(src);
    if (uri.scheme.includes('http')) {
        return `<script src="${src}">`;
    } else {
        return `<script>\n${readCss(src)}\n</script>`;
    }
}

function readCss(fileName: string) {
    try {
        return fs.readFileSync(fileName).toString().replace(/\s+/g, ' ');
    } catch (error) {
        let msg = error.message.replace('ENOENT: no such file or directory, open', 'Custom style') + ' not found.';
        msg = msg.replace(/'([c-z]):/, function (match, g1) {
            return `'${g1.toUpperCase()}:`;
        });
        vscode.window.showWarningMessage(msg);
        return '';
    }
}

function getCustomStyleSheets(resource: vscode.Uri): string[] {
    const styles = vscode.workspace.getConfiguration('markdown')['styles'];
    if (styles && Array.isArray(styles) && styles.length > 0) {
        return styles.map(s => {
            let uri = vscode.Uri.parse(fixHref(resource, s));
            if (uri.scheme === 'file') {
                return uri.fsPath;
            }
            return s;
        });
    }
    return [];
}

function fixHref(resource: vscode.Uri, href: string): string {
    if (!href) {
        return href;
    }

    // Use href if it is already an URL
    const hrefUri = vscode.Uri.parse(href);
    if (['http', 'https'].indexOf(hrefUri.scheme) >= 0) {
        return hrefUri.toString();
    }

    // Use href as file URI if it is absolute
    if (path.isAbsolute(href) || hrefUri.scheme === 'file') {
        return vscode.Uri.file(href).toString();
    }

    // Use a workspace relative path if there is a workspace
    let root = vscode.workspace.getWorkspaceFolder(resource);
    if (root) {
        return vscode.Uri.file(path.join(root.uri.fsPath, href)).toString();
    }

    // Otherwise look relative to the markdown file
    return vscode.Uri.file(path.join(path.dirname(resource.fsPath), href)).toString();
}