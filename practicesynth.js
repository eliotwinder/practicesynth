window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new window.AudioContext();

//calculate the frequency of a note based on start (hz); pitch is halfsteps away from a4
function calculateFrequency(pitch, start){
	var noteFrequency = start*Math.pow(Math.pow(2,1/12),pitch);
	return noteFrequency;
}

//variables for local storage
	var seshInProgress = true;
	var note = {};

//add synth to the keyboard
function addSynthProperties(object){
	//object to hold active oscillators and gain

	
	//envelope functions

	//attac delay, sustain
	function ads( attribute, level, attack, decay, sustain) {
		var time = context.currentTime;

	  	attribute.cancelScheduledValues(time);
	  	//set envelope to zero to add attack
		attribute.setValueAtTime(0,context.currentTime);

		//attack envelope - 1st arg is target volume for top of attack (from oscillator), 2nd arg is time 
		attribute.linearRampToValueAtTime( parseFloat(level), time += parseFloat(attack));
		//decay
		attribute.linearRampToValueAtTime( parseFloat(sustain*level), time + parseFloat(decay));	  
	}

	//function adds a gainnode, connects it to output, connects input to it, and adds an ads
	function addGainADS( input, output, amt, a, d, s ) {
		//create new gain node
		var gainNode = context.createGain();
		//connect gain node to output
		gainNode.connect( output );
		//connect input to this gain node
		input.connect( gainNode );
		//use ADS function for envelope
		gainNode.gain.value = amt;
		ads(gainNode.gain, amt, a, d, s);

		//return the gainNode so that it can be retrieved from the notes holder array	
		return gainNode;
	}

	//adds release to a given attribute - time = release time
	function release( attribute, time) {
		var now = context.currentTime;
		//cancel already planned event to avoid problems with note repeats
		attribute.cancelScheduledValues(now);

		//release time
		attribute.linearRampToValueAtTime( 0 , parseFloat(now) + parseFloat(time));
	}

	
	//method to playpiano - includes check to see if each osc is turned on (has a checked box)
	object.playPiano = function (){ 
		$('.osc').each( function(){
			var el = $(this);
			var onoff = el.find('.onoff');
			var waveform = el.find('.waveform option:selected');
			var octave = el.find('.octave');
			var oscDetune = el.find('.detune');			
			var gain = el.find('.gain');
			var gainAttack = el.find('.volattack');
			var gainSustain = el.find('.volsustain');
			var gainDecay = el.find('.voldecay');
			var gainRelease = el.find('.volrelease');
			var transpose = el.find('.transpose');
			var oscDetune = el.find('.detune');
			var masterOctave = $('#mastercontrol #masteroctave');
			var masterVolume = $('#mastercontrol .volgain');
			var masterVolAttack = $('#mastercontrol .volattack');
			var masterVolDecay = $ ('#mastercontrol .voldecay');
			var masterVolSustain = $('#mastercontrol .volsustain');
			var masterVolRelease = $('#mastercontrol .volrelease'); 

			if(onoff.prop('checked') == true) {
				var osc = context.createOscillator();

			  	//pseudo master gain node: this gain node will be the same in all oscillators, mimicking a master channel, but allows us to start a new note
			  	var gainNodeMaster = context.createGain();
			  	gainNodeMaster.connect(context.destination);
			  	
			  	
			  	
			  	//sets waveform based on dropdown
			  	osc.type = waveform.text();

			  	//frequency is the note + octave for master and octave for this osc
				osc.frequency.value = calculateFrequency( object.frequencyStep + parseFloat(transpose.val()) + parseFloat(masterOctave.val()*12), 130.81);

			  	//detune for this oscillator
				osc.detune.value = oscDetune.val();

			  	//create new gainnode that takes input osc, and output master gain node, with ads
			  	var gainNode = addGainADS(osc, gainNodeMaster, gain.val(), gainAttack.val(), gainDecay.val(), gainSustain.val());

				//start this oscillator	
				osc.start(0);

				//ADD ALL MODULES HERE - keeps track of variable active oscillators and routing
			  	
			  	note[$(this).attr('oscnum')] = {
			  		osc: osc,
			  		gainNode: gainNode,
			  		masterGain: gainNodeMaster
			  	};
			  	
			}
		});
	}		

	object.stopPiano = function () {
		$('.osc').each(function() {
			var el = $(this);
			var volumeRelease = el.find('.volrelease');
			var masterRelease = $('#mastercontrol .release');
			
			if(note[$(this).attr('oscnum')]){
				//variables to retrieve from note array that were created in startpiano
				var osc = note[$(this).attr('oscnum')].osc;	
				var gainNode = note[$(this).attr('oscnum')].gainNode;
				var masterGain = note[$(this).attr('oscnum')].masterGain;

				//gainNode release
				release(gainNode.gain, volumeRelease.val());
			
				//remove this property from the note list, cause it's done playing!
				delete note[$(this).attr('oscnum')];
			}
		});
	}
}

//check if local storage is available
function supportsLocalStorage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

//save function
function saveState() {
    if (!supportsLocalStorage()) { return false; }
    localStorage["synth.sesh.in.progress"] = seshInProgress;
    $(':input').each(function(){
    	if($(this).prop('type') === 'checkbox') {	
    		localStorage[$(this).data('identifier')] = $(this).is(':checked');
    	} else {
    		localStorage[$(this).data('identifier')] = $(this).val();
    	}
    });
    
    return true;
}

//load function
function loadState() {
	if (!supportsLocalStorage()) { return false; }
	if (!localStorage["synth.sesh.in.progress"]) { return false; }


	//event listener to save statee whenever and input is changed
	$(':input').each(function(){
		//check if it is a checkbox
	 	if (localStorage[$(this).data('identifier')] === 'true' || localStorage[$(this).data('identifier')] === 'false' ) {
    		$(this).prop( 'checked', localStorage[$(this).data('identifier')] != 'false');	
    	} else {
    		//set value of the input
    		$(this).val( localStorage[$(this).data('identifier')]);
    	}
    });
}

//function to create control panels - number is how many panels we want
function createOscControlPanels(number) {
	var oscControlPanel = $('.osc');
	var oscControlPanelWrapper = $('.controlpanelwrapper');
	
	for (var i = 0; i < number; i++) {
		var el = oscControlPanel.clone();
		el.show();
		el.attr('oscnum', i);
		el.find('input, select').each(function() {
			$(this).data('identifier', $(this).data('identifier') + $(this).parent().attr('oscnum'));
		});
		el.find('h2').text('Oscillator ' + (i + 1));
		oscControlPanelWrapper.append(el);
	}
	oscControlPanel.remove();

} 

$(function(){
	//create an array with frequencies starting from the bottom note
	var numberOfOscillators = 1;

	createOscControlPanels( numberOfOscillators );
	
	loadState();
	
	//array with charcodes for the computer keys in order of piano
	var keyboardStrokes = ['a','w','s','e','d','f','t','g','y','h','u','j','k','o','l','p'];
	var keyToCharCode = [];

	for (var i = 0; i < keyboardStrokes.length; i++) {
		keyToCharCode.push(keyboardStrokes[i].charCodeAt(0)-32);
	}
	
	var current = 0;

	//assign step to keys
	$('.key').each(function() {
		this.frequencyStep = current;
		$(this).data("frequency", current);
		addSynthProperties(this);
		$(this).prop('id', 'keynumber'+keyToCharCode[current]);
		current++;
	});

		//save state when inputs are changed
	$(':input').change(function() {
			saveState();
	});


	//keyboard control
	var keysThatAreDown = {}; //object that holds keys that are pressed to avoid repetitive keypress
	$(document).on( "keydown", function( event ) {
		if($.inArray(event.which, keyToCharCode) > -1) { 
			if (!keysThatAreDown[event.which]) {
				if ( $("#keynumber"+event.which).is('span') ) 	
					$("#keynumber"+event.which).addClass('pressedblack');
				else
					$("#keynumber"+event.which).addClass('pressedwhite');
				$("#keynumber"+event.which)[0].playPiano();
				keysThatAreDown[event.which] = true;
			}
		}
	});
	
	$(document).on( "keyup", function( event ) {
		if($.inArray(event.which, keyToCharCode) > -1) {  
			$("#keynumber"+event.which).removeClass('pressedwhite pressedblack');
			$("#keynumber"+event.which)[0].stopPiano(0);
			keysThatAreDown[event.which] = false;
			$("#keynumber"+event.which)[0].stopPiano(0);
		}
		
	});

	//track if mouse is down
	var mouseDown = 0;
	document.body.onmousedown = function() { 
		mouseDown++;
	}
	
	document.body.onmouseup = function() {
		mouseDown--;
	}

	//stop and play the synth with mouse
	$('.key').on('mousedown', function(){
		if ( $(this).is('span') ) 	
			$(this).addClass('pressedblack');
		else
			$(this).addClass('pressedwhite');
		this.playPiano();
	});

	$('.key').on('mouseover', function(){
		if (mouseDown == 1) {
			if ( $(this).is('span') ) 	
				$(this).addClass('pressedblack');
			else
				$(this).addClass('pressedwhite');
			this.playPiano();
		}
	});


	$('.key').on('mouseup mouseout', function(){
		$(this).removeClass('pressedwhite pressedblack')
		this.stopPiano();
	});

	// touch events
	$('.key').on('touchstart touchenter', function(event){
		event.preventDefault();
		if ( $(this).is('span') ) 	
			$(this).addClass('pressedblack');
		else
			$(this).addClass('pressedwhite');
		this.playPiano();
	});

	$('.key').on('touchend touchleave', function(){
		$(this).removeClass('pressedwhite pressedblack')
		this.stopPiano();
	});
});

