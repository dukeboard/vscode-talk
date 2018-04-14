import * as vs from 'vscode';
import { FILE } from 'dns';
const fs = require('fs');



export class ImgCompletion implements vs.CompletionItemProvider {
    provideCompletionItems(document: vs.TextDocument, position: vs.Position, token: vs.CancellationToken, context: vs.CompletionContext): vs.ProviderResult<vs.CompletionItem[] | vs.CompletionList> {
        const range = new vs.Range(new vs.Position(position.line,0),position);
        const currentLine = document.getText(range);

        let itemList: vs.CompletionItem[];

        if(this.correctLine(currentLine, position.character)) {
            let rootPath = document.uri.fsPath;
            rootPath = rootPath.substring(0, rootPath.lastIndexOf('/'));

            const posEndPath = currentLine.lastIndexOf("/");
            if(posEndPath > 0) {
                const posBeginPath = currentLine.lastIndexOf("("); 
                rootPath = rootPath + "/" + currentLine.substring(posBeginPath + 1,posEndPath);
            }

            itemList = this.getFolderItems(rootPath);
        } else {
            itemList = Array();            
        }

        return new vs.CompletionList(itemList,false);
    }

    private correctLine(line: string, cursorPos: number): boolean {
        for(let i=cursorPos; i>0;i--) {
            if(line.charAt(i) === '(' && line.charAt(i-1) === ']' && line.charAt(i-2) === '[' && line.charAt(i-3) === '!') {
               return true;
            }
        }
        return false;
    }

    private getFolderItems(path: string): vs.CompletionItem[] {
        const items: Array<string> = fs.readdirSync(path);
        const res: vs.CompletionItem[] = Array();

        items.forEach( item => {
            const stats = fs.lstatSync(path + "/" + item);

            if(stats.isDirectory()) {
                const compleItem = new vs.CompletionItem(item, vs.CompletionItemKind.Folder);
                compleItem.command = {
                    command: 'default:type',
                    title: 'triggerSuggest',
                    arguments: [{
                        text: '/'
                    }]
                };
                res.push(compleItem);
            } else if(this.isImage(item)) {
                const compleItem = new vs.CompletionItem(item, vs.CompletionItemKind.File);
                res.push(compleItem);
            }

        });

        return res;
    }

    private isImage(file: string): boolean {
        return file.endsWith(".svg") || file.endsWith(".png");
    }


}