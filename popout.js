/**
 * Created by Shayan on 5/22/14.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Popout window loaded");
    Messenger.sendCommand("getdownloads");

    //Start the statusUpdateCallback to update progress, if not started
    $('.downloadDiv').bind('onload', function(){
        if(!PopoutUI.statusUdateCallbackStarted)
        {
            PopoutUI.statusUdateCallbackStarted=true;
            setInterval(Messenger.statusUpdateCallback,1000);
        }
});
});


var Messenger=(function()
{
    var port = chrome.extension.connect({name: "Communication Link"});
    //port.postMessage({method : "getdownloads"});
    port.onMessage.addListener(function(msg) {
        console.log("message recieved: "+ JSON.stringify(msg));
        if(msg.type)
        {
            if(msg.type=="downloads")
            {
                var downloadsMap=msg.downloads;
                PopoutUI.init(downloadsMap);
                /*var downloadsCount=Object.keys(msg.downloads).length;
                console.log( "Downloads in progress :"+downloadsCount);
                $("#contentDiv").html(PopoutUI.downloadDiv('test'));*/
            }
            else if (msg.type == "progressStatus") {
                var progressMap = msg.progressStatus;
                PopoutUI.updateProgress(progressMap);
            }

        }
    });



    var statusUpdateCallback = function()
    {
        console.log("Status Update!!!");
        sendCommand('getProgressStatus');
    }

    var sendCommand = function(cmd)
    {
        port.postMessage({method : cmd});
    }

    return {
        sendCommand : sendCommand,
        statusUpdateCallback : statusUpdateCallback
    };
})()

var PopoutUI=(function()
{

    var uiDownloadMap;

    var downloadDiv = function(downloadInfo){
        console.log("creating download div with id "+downloadInfo.id);
        var progressBar=$('<progress/>',{
            value:0,
            max: downloadInfo.size
        });
        var fileNameDiv=$('<div/>', {
            class: 'fileNameDiv',
            html: downloadInfo.fileName
        });

        var fileSizeMB=downloadInfo.size/1024;
        fileSizeMB=fileSizeMB>1000?(Math.round(fileSizeMB/1024))+"MB":Math.round(fileSizeMB)+"KB";
        var infoDiv=$('<div/>', {
            class: 'infoDiv',
            html: fileSizeMB
        });

        var downloadInfoDiv=$('<div/>', {
            class: 'downloadInfoDiv',
            html:fileNameDiv
        });

        downloadInfoDiv.append(infoDiv);

        var dDiv=$('<div/>', {
            id: downloadInfo.id,
            class: 'downloadDiv',
            html: downloadInfoDiv
        });

        dDiv.append(progressBar);

        return dDiv;
    }


    var updateProgress = function (progressMap) {
        console.log("Inside updateProgress ");
        if (!$.isEmptyObject(progressMap)) {

            console.log("Downloads " + JSON.stringify(progressMap));
            var downloadIDs = Object.keys(progressMap);
            for (var i = 0; i < downloadIDs.length; i++) {
                var id = downloadIDs[i];
                var progress = progressMap[id];
                $('#' + id).find("progress").val(progress);
            }
        }
    }

    var init = function (downloadMap) {

        if (!$.isEmptyObject(downloadMap)) {
            uiDownloadMap = downloadMap;
            console.log("Downloads " + JSON.stringify(downloadMap));
            var downloadIDs = Object.keys(downloadMap);
            for (var i = 0; i < downloadIDs.length; i++) {
                var downloadID = downloadIDs[i];
                console.log("Processing download " + downloadID);
                var downloadInfo = downloadMap[downloadID];
                $("#contentDiv").append(downloadDiv(downloadInfo));
            }
            if (!PopoutUI.statusUdateCallbackStarted) {
                PopoutUI.statusUdateCallbackStarted = true;
                setInterval(Messenger.statusUpdateCallback, 1000);
            }
        }
        else {
            var msgDiv = $('<div/>', {
                id: 'messageDiv',
                html: 'There are no downloads in queue'
            });
            // $("#contentDiv").append("There are no downloads in queue");
            $("#contentDiv").append(msgDiv);
        }
    }

    return {
        init : init,
        updateProgress: updateProgress
    };

})()