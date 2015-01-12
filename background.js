/**
 * Created by Shayan on 5/22/14.
 */

/*chrome.webRequest.onBeforeRequest.addListener(
    function(info) {
        if (info.url.indexOf('OAS_WV.exe') != -1) {
            console.log("Download Starting!!!");

            var downloader=new DownloaderApp();
            downloader.download(info.url,info.method);
            return {
                cancel: true
            };
        }
        console.log("on before request");
    },
    {urls: ["<all_urls>"]},
    ["blocking"]
);*/



var DownloaderApp = (function(){

    var downloadsMap= {};
    var progressMap={};


    var addDownload = function(downloadItem)
    {
        var filePartArray;
        var filePartRangeArray;
        var filePartProgressArray;
        var filePartLoaded;


        var multipart=true;
        var url=downloadItem.url;
        var downloadID=downloadItem.id;
        var dSize = downloadItem.totalBytes;
        var downloadObject ={};

        downloadObject['id']=downloadID;
        downloadObject['url']=url;
        downloadObject['fileName']=downloadItem.filename;
        downloadObject['completed']=false;
        downloadObject['size']=dSize;
        downloadObject['startTime']=Date.now();

        downloadsMap[downloadID]=downloadObject;
        progressMap[downloadID]=0;

        if(dSize>1048576 && multipart)//size greater than 1 MB
        {
            //divide into fileparts
            var partCount=32;  //TODO Generate this dynamicaly depending on file size
            var partSize=Math.floor(dSize/partCount);
            var start=1;
            var end=0;
            filePartArray= new Array(partCount);
            filePartProgressArray= new Array(partCount);
            filePartRangeArray= new Array(partCount);
            filePartLoaded= new Array(partCount);

            for(var i=0;i<partCount;i++)
            {
                end=start+partSize;
                if(end>dSize)
                {
                    end=dSize
                }
                console.log("Part "+i+" start:"+start+" end:"+end);
                var range={start:start,end:end};
                filePartRangeArray[i]=range;
                downloadMultiPart(url,i);
                start=end+1;
            }

        }
        else
        {
        download(url);
        }

        function downloadMultiPart(fileurl,partIndex)
        {
            var dowReq = new XMLHttpRequest();
            filePartLoaded[partIndex]=false;
            dowReq.open("GET",fileurl,true);
            dowReq.responseType="arraybuffer";
            var range=filePartRangeArray[partIndex];
            dowReq.setRequestHeader("Range", "bytes="+range.start+"-"+range.end);
            var filePartSize=range.end-range.start;
            dowReq.onload =function(){
                var dowBuffer = dowReq.response;

                if(dowBuffer)
                {
                    filePartArray[partIndex]=dowBuffer;
                    filePartLoaded[partIndex]=true;
                }
            }

            dowReq.onprogress = function(evt)
            {
                console.log("Download progress");
                if(evt.lengthComputable)
                {
                    //var fractionComplete=evt.loaded/evt.total;
                    var loadedSize=evt.loaded;
                    console.log("Loaded "+loadedSize+" of "+fileurl);
                    filePartProgressArray[partIndex]=loadedSize;
                    updateProgress();

                }
            }

            dowReq.send();

            function updateProgress()
            {
                var totalSize=0;
                var progress;
                for(var i= 0;i<filePartProgressArray.length;i++)
                {
                    progress=filePartProgressArray[i];
                    if(progress)
                    {
                        totalSize+=progress;
                    }
                }

                progressMap[downloadID]=totalSize;
            }

        }

        //Function to download files without ranged requests /multipart download
        function download(url)
        {
            var dowReq = new XMLHttpRequest();
            dowReq.open("GET",url,true);
            dowReq.responseType="arraybuffer";

            //call back for what to do once the file has been loaded
            dowReq.onload =function(){
                var dowBuffer = dowReq.response;

                if(dowBuffer)
                {
                    var downloadedBlob = new Blob([dowBuffer]);
                    //TODO actually save the file to disk
                }
            }

            //callback to update progressMap which in turn is used to update progressbar
            dowReq.onprogress = function(evt)
            {
                console.log("Download progress");
                if(evt.lengthComputable)
                {
                    //var fractionComplete=evt.loaded/evt.total;
                    progressMap[downloadID]=evt.loaded;

                }
            }

            //Start the download AJAX request
            dowReq.send();
        }


    }

    function saveBlobToFile(blobToWrite, filename, onWriteComplete) {
        var urlToFile;
        window.webkitRequestFileSystem(
            window.PERSISTENT, //what storage to access : PERSISTENT / TEMPORARY
            1024 * 1024,  //how much space we need: but thanks to the 'unlimited storage' permission, it is just a token
            function (fs) //callback to access file system
            {
                fs.root.getFile( //callback to get a file
                    filename, //name of file to get
                    {create: true}, //permision to create if file does not exist
                    function (fileEntry) //callback to define what to do with file after getting it
                    {
                        // Create a FileWriter object for our FileEntry (log.txt).
                        fileEntry.createWriter(
                            function (fileWriter) //callback to actually write the file
                            {
                                fileWriter.onwriteend = function (e) {
                                    //what to do when write completes
                                    console.log('Write completed.');
                                    urlToFile = fileEntry.toURL();
                                    console.log("URLtoFile: " + urlToFile);
                                    if (onWriteComplete) {
                                        onWriteComplete(urlToFile);
                                    }
                                };

                                fileWriter.onerror = function (e) {
                                    //what to do when write fails
                                    console.log('Write Error.');
                                    fileSystemErrorHandler(e);
                                };

                                fileWriter.write(blobToWrite);
                                urlToFile = fileEntry.toURL();
                                console.log("URLtoFile: " + urlToFile);
                                onWriteComplete(urlToFile);
                            },
                            fileSystemErrorHandler);

                    },
                    fileSystemErrorHandler);
            },
            fileSystemErrorHandler);
    }

    function fileSystemErrorHandler(e) {
        var msg = '';

        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                msg = 'QUOTA_EXCEEDED_ERR';
                break;
            case FileError.NOT_FOUND_ERR:
                msg = 'NOT_FOUND_ERR';
                break;
            case FileError.SECURITY_ERR:
                msg = 'SECURITY_ERR';
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                msg = 'INVALID_MODIFICATION_ERR';
                break;
            case FileError.INVALID_STATE_ERR:
                msg = 'INVALID_STATE_ERR';
                break;
            default:
                msg = 'Unknown Error';
                break;
        }
        ;

        console.log('Error: ' + msg);
    }

    return {
        addDownload: addDownload,
        downloads: downloadsMap,
        progressStatusMap: progressMap
    };
})();


//This listener is fired when chrome has found out the all the required information about the download has been acquired by Chrome
chrome.downloads.onDeterminingFilename.addListener(function (downloadItem)
{
    var downloadURL= downloadItem.url;
    console.log("Download item url: "+downloadURL);

    console.log("Cancel download item : "+downloadItem.id);
    chrome.downloads.cancel(downloadItem.id); //The chromes default download mechanism is aborted
    DownloaderApp.addDownload(downloadItem); //Start the download with our extension

})


//callback to maintain communication channel with popup
chrome.runtime.onConnect.addListener(function(port) {

    port.onMessage.addListener(function(msg) {

        console.log("receieved message "+JSON.stringify(msg));
        if(msg.method)
        {
            if(msg.method=="getdownloads")
            {
                var responseMsg ={};
                responseMsg["type"]="downloads";
                responseMsg["downloads"]=DownloaderApp.downloads;
                port.postMessage(responseMsg);
            }
            else if(msg.method=="getProgressStatus")
            {
                var responseMsg ={};
                responseMsg["type"]="progressStatus";
                responseMsg["progressStatus"]=DownloaderApp.progressStatusMap;
                port.postMessage(responseMsg);
            }
        }
       /* if (msg.request == "getdownloads")
            port.postMessage({question: "Who's there?"});
        else if (msg.request == "getStatus")
            port.postMessage({question: "Madame who?"});
        else if (msg.answer == "Madame... Bovary")
            port.postMessage({question: "I don't get it."});*/
    });
});
/*chrome.webRequest.onResponseStarted.addListener(
    function(info) {
        if (info.statusCode == 200 && info.url.indexOf('OAS_WV.exe') != -1) {
            console.log("OnResponse");
            return {
                cancel: true
            };
        }
    },
    {urls: ["<all_urls>"]}
);*/





