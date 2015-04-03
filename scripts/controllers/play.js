'use strict';

/**
 * @ngdoc function
 * @name soundPlay.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the soundPlay
 */
angular.module('soundPlay')
  .controller('PlayCtrl', function ($scope, globals, $location, g_sound, mydb) {


    //preference restored from indexdb    
    var loading_view = 0, play_view = 1, filter_view = 2, spatial_view = 3, playback_view = 4;    
    $scope.view = loading_view;

    //set default values
    $scope.playback_rate = 1;
    $scope.spatial_x = 0;
    $scope.filter_type = "none";
    
    //listen for accelerometer
    window.addEventListener('deviceorientation', handleOrientation);

    //reset/initialize panner pos
    //resetPanner();
globals.current_music_id = 48230395;
    try{
      //stop music to play a new one
      g_sound.source.stop(0);
    }catch(e){
      console.log(e);
    }

    //fetch from db
    if (!mydb.ready) {
      console.log('DB is not ready: play.js');
      $location.path('/main');
      return;
    }    
    
    var transaction = mydb.db.transaction('data', 'readwrite');    
    var objectStore = transaction.objectStore('data');
    var db_request = objectStore.get(globals.current_music_id);

    
    db_request.onsuccess = function(e) {
      var saved_data = e.target.result;
      if(saved_data === undefined){
        console.log("loading by XMLHttpRequest");

        var request = new XMLHttpRequest();
          var url = "http://api.soundcloud.com/tracks/48230395/stream?client_id=22a6f6d4d6138acff711c666f09a62c7";
        request.open("GET", url, true);
        request.responseType = "arraybuffer";
        alert("making Http Request");
        request.onload = function(){
            alert("decoding audio");
            //'request.response' is arraybuffer
            //'buffer' is decoded data - type = AudioBuffer: (IEEE754) 32 bits floating point buffer (float32)
            g_sound.context.decodeAudioData(request.response, function(buffer){
                alert("Audio decoded - loading buffer");    
                $scope.$apply(function() {
                    $scope.view = play_view;
                });         
                //console.log("buffer....");           
                //console.log(buffer);            
/*
                var one = buffer.getChannelData(0);
                var two = buffer.getChannelData(1);

                var yoink = g_sound.context.createBuffer(2, buffer.length, buffer.sampleRate);
                console.log(yoink);
                
                var one_y = yoink.getChannelData(0);
                var two_y = yoink.getChannelData(1);

                for ( var n = 0; n < one.length; n++ ) {
                  one_y[n] = one[n];
                }         
                for ( var n = 0; n < two.length; n++ ) {
                  two_y[n] = two[n];
                }         
*/    
                //make array float32 channel data 
                var tmp_channel_data_arr = [];
                alert("---s---");
                for(var i=0; i<buffer.numberOfChannels; i++){
                  alert(i);
                  tmp_channel_data_arr[i] = buffer.getChannelData(i);
                }
                alert("---e---");
                //insert the buffer data into the db
                mydb.insert(globals.current_music_id, tmp_channel_data_arr, buffer.numberOfChannels, buffer.length, buffer.sampleRate, $scope.filter_type, $scope.playback_rate, $scope.spatial_x);
                alert("inserted?");
                //console.log("buffer....");           
                //globals.current_music_id = 48230395;
                //mydb.insert2(globals.current_music_id, one);
                //mydb.insert2(globals.current_music_id, buffer);
                //mydb.insert3(48230395, two);
                //console.log(mydb.fetch(globals.current_music_id+"_b"));
                //console.log("inserted?");         

                g_sound.mySoundBuffer = buffer;                      
                //g_sound.mySoundBuffer = yoink;                      

                g_sound.isPaused = false;
                $scope.play();            
            }, onError);
        };
        request.send();
      }else{
        alert('previous setting retrieved for the music');
        console.log('previous setting retrieved for the music');  

        $scope.$apply(function() {
            $scope.view = play_view;
        });  

        //retrieve saved buffer data
        var channel_data_arr = saved_data['channel_data_arr'];
        var num_channel = saved_data['num_channel'];
        var buff_length = saved_data['buff_length'];
        var sample_rate = saved_data['sample_rate'];
        //recombine the scattered data into AudioBuffer
        var tmp_buffer = g_sound.context.createBuffer(num_channel, buff_length, sample_rate);
        var tmp_channel_data_arr = [];
        //pointer mapping
        for(var i=0; i<num_channel; i++){
          tmp_channel_data_arr[i] = tmp_buffer.getChannelData(i);
        }
        //copying channel data to tmp buffer channel data
        for(var i=0; i<num_channel; i++){
          var channel_length = channel_data_arr[i].length;
          for(var j=0; j < channel_length; j++){
            tmp_channel_data_arr[i][j] = channel_data_arr[i][j];
          }
        }
        g_sound.mySoundBuffer = tmp_buffer;       
        g_sound.isPaused = false;
        $scope.play();  
/*
                var one = buffer.getChannelData(0);
                var two = buffer.getChannelData(1);

                var yoink = g_sound.context.createBuffer(2, buffer.length, buffer.sampleRate);
                console.log(yoink);
                
                var one_y = yoink.getChannelData(0);
                var two_y = yoink.getChannelData(1);

                for ( var n = 0; n < one.length; n++ ) {
                  one_y[n] = one[n];
                }         
                for ( var n = 0; n < two.length; n++ ) {
                  two_y[n] = two[n];
                }         

        //console.log("channel_data_arr is retrieved!!!");
        //console.log(channel_data_arr.length);                
*/

      }
    }



    console.log(globals.current_music_id);

    //var url = 'http://api.soundcloud.com/tracks/'+globals.current_music_id+'/stream?client_id='+globals.client_id; 




    function onError(){
      console.log("error while loading request");
    }


    $scope.play = function(){        
      g_sound.source = g_sound.context.createBufferSource();
      // tell the source which sound to play
      g_sound.source.buffer = g_sound.mySoundBuffer;  

      g_sound.source.connect(g_sound.context.destination); 

      //g_sound.source.connect(g_sound.panner);
      //pannerSetPos(0, 0, 295); //private function
      //g_sound.panner.connect(g_sound.context.destination);


      if(g_sound.isPaused){
        g_sound.isPaused = false;
        g_sound.source.start(0, g_sound.pausedAt); 
      }else{
        g_sound.source.start(0, 0);                      
      }
                                                       
    };


    //playback rate change
    $scope.$watch('playback_rate', function(){      
      try{
        console.log($scope.playback_rate);
        g_sound.source.playbackRate.value = $scope.playback_rate;
      }catch(e){
        console.log(e);
      }      
    });    

  
    //spatial_x change
    $scope.$watch('parent.view', function(newval, oldval){     
      console.log(newval+" "+oldval);      
    }, true); 


    $scope.pause = function(){
      //save the paused time of the music 
      g_sound.pausedAt = g_sound.source.context.currentTime;
      g_sound.isPaused = true;
      g_sound.source.stop(0);

      //console.log(g_sound.source.context.currentTime);
    };

    $scope.stop = function(){
      g_sound.isPaused = false;
      g_sound.pausedAt = 0;
      g_sound.source.stop(0);
    };



/*
    $scope.lowFilter = function(){
      
    };
*/
    //accelerometer event function
    function handleOrientation(event) {
      // Do stuff with the new orientation data
      var absolute = event.absolute;
      var alpha    = event.alpha;
      var beta     = event.beta;
      var gamma    = event.gamma;
/*      
      if(!g_sound.isPaused && gamma > 30){
        //if less than 10, increase panner pos by 0.1
        if(g_sound.xPos < 10)
          g_sound.xPos += 0.1;        
      }else if(!g_sound.isPaused && gamma < -30){
        //if bigger than -10, decrease panner pos by 0.1
        if(g_sound.xPos > -10)
          g_sound.xPos -= 0.1;
      }
      pannerSetPos(g_sound.xPos, g_sound.yPos, g_sound.zPos);
*/
      //$('#gamma').text(gamma);
      //$('#xPos').text(g_sound.xPos);      
    }
/*
    function resetPanner(){
      g_sound.xPos = 0;
      g_sound.yPos = 0;
      g_sound.zPos = 295;      
    }
    function pannerSetPos(xPos, yPos, zPos){
      g_sound.panner.setPosition(xPos, yPos, zPos);
    }
*/

    $('#reset').click(function(){
      mydb.remove(globals.current_music_id);
    });

});
