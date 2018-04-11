'use strict';

import * as vscode from 'vscode';

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

export function activate(context: vscode.ExtensionContext) {
    return {
        extendMarkdownIt(md: any) {
            md.renderer.rules['hr'] = hr_section;
            try {
                md.use(require('markdown-it-sup'));
                md.use(require('markdown-it-sub'));
                md.use(require('markdown-it-decorate'));
                var Plugin = require('markdown-it-regexp');
                md.use(Plugin(
                    /\:fa-([\w\-]+)\:/,
                    function (match, utils) {
                        return '<span class="fa fa-' + utils.escape(match[1]) + '"></span>';
                    }
                ));
            }catch (e) { 
                console.error(e);
            }
            var proxy = md.render;
            function ex_render(mdContent, options, env) {
                try {
                    var contentResult = proxy.apply( this, arguments );
                    var trimmed = mdContent.trim();
                    if (trimmed.indexOf('<!--{.darkSlide}-->') === 0) {
                        return '<section class=\"slide darkSlide\">' + contentResult + '</section>';
                    }
                    if (trimmed.indexOf('<!--{.greenSlide}-->') === 0) {
                        return '<section class=\"slide greenSlide\">' + contentResult + '</section>';
                    }
                    if (trimmed.indexOf('<!--{.darkBlueSlide}-->') === 0) {
                        return '<section class=\"slide darkBlueSlide\">' + contentResult + '</section>';
                    }
                    if (trimmed.indexOf('<!--{.redSlide}-->') === 0) {
                        return '<section class=\"slide redSlide\">' + contentResult + '</section>';
                    }
                    if (trimmed.indexOf('<!--{.yellowSlide}-->') === 0) {
                        return '<section class=\"slide yellowSlide\">' + contentResult + '</section>';
                    }
                    return '<section class=\"slide\">' + contentResult + '</section>';
                } catch (e) { 
                    console.error(e);
                }
            }
            md.render = ex_render.bind(md);
            return md;
        }
    }
}