var bodyStyle = document.body.style;
document.body.className = "shower list";
//document.body.classList.add("list");
//document.body.classList.add("vscode-body");
//document.body.classList.add("vscode-dark");

//bodyStyle.setProperty('--slideMargin', 25);
bodyStyle.setProperty('--slideWidth', 1024);
bodyStyle.setProperty('--slideHeight', 768);
bodyStyle.setProperty('--slidePreviewWidth', document.body.clientWidth);
window.onresize = function(){
        bodyStyle.setProperty('--slidePreviewWidth', document.body.clientWidth);
}