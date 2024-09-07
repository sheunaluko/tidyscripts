[**Tidyscripts Docs**](../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../globals.md) / [web](../../../../README.md) / [util](../../README.md) / voice\_interface

# voice\_interface

Main voice interface for controlling (Web Browser) speech recognition and tts at high level. 

**Warning:** Please note that only Chrome and Safari currently support the browser Speech Recognition API. You CANNOT use Brave, Firefox, or other browsers. 

\
```audio_processing.ts``` 

Connects to microphone and detects when there is sound occuring 

\
```speech_recognition.ts```

Starts and stops speech recognition and provides recognition results 

\
```tts.ts```

Performs speech synthesis given a string 

This file combines the three aforementioned libraries to create an out of the box seamless 
voice/ tts experience. 

The audio processor is used to detect when a spike in volume has occured, and it triggers 
the speech recognizer to start listening. 

When the tts.speak function is called, the speech recognizer is automatically paused until tts 
has finished. 

To use, simply call initialize_recognition() , and the recognition results will be available by 
listending to the window.addEventListener( 'tidyscripts_web_speech_recognition_result' , (e) => e.detail ) handler 

For tts, call speak(text)  

*

## Index

### Namespaces

- [ap](namespaces/ap/README.md)

### Enumerations

- [RecognitionState](enumerations/RecognitionState.md)

### Variables

- [recognition](variables/recognition.md)
- [recognition\_state](variables/recognition_state.md)

### Functions

- [initialize\_recognition](functions/initialize_recognition.md)
- [pause\_recognition](functions/pause_recognition.md)
- [set\_default\_tts\_rate](functions/set_default_tts_rate.md)
- [set\_default\_voice\_from\_name\_preference\_list](functions/set_default_voice_from_name_preference_list.md)
- [set\_default\_voice\_uri](functions/set_default_voice_uri.md)
- [speak](functions/speak.md)
- [speak\_with\_rate](functions/speak_with_rate.md)
- [speak\_with\_voice](functions/speak_with_voice.md)
- [start\_recognition](functions/start_recognition.md)
- [start\_recognition\_and\_detection](functions/start_recognition_and_detection.md)
- [stop\_recognition](functions/stop_recognition.md)
- [stop\_recognition\_and\_detection](functions/stop_recognition_and_detection.md)

## References

### sr

Renames and re-exports [speech_recognition](../speech_recognition/README.md)

***

### tts

Re-exports [tts](../tts/README.md)
