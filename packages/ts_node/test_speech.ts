/**
 * Test script for speech synthesis functionality
 */

import { speech } from './src/puppeteer/index';

async function test_speech_synthesis() {
    console.log('Testing speech synthesis functionality...');
    
    try {
        // Test 1: Get available voices
        console.log('\n1. Getting available voices...');
        const voices = await speech.get_available_voices();
        console.log(`Found ${voices.length} voices:`);
        voices.slice(0, 3).forEach(voice => console.log(`  - ${voice}`));
        
        // Test 2: Record a simple text
        console.log('\n2. Recording speech synthesis...');
        const result = await speech.record_speech_synthesis(
            "Hello, this is a test of the speech synthesis recording functionality!",
            {
                rate: 1.0,
                pitch: 1.0,
                volume: 1.0,
                outputPath: './test_speech_output.webm'
            }
        );
        
        if (result.success) {
            console.log(`✅ Speech synthesis successful! Audio size: ${result.audioBuffer.length} bytes`);
            console.log('📁 Audio saved to: ./test_speech_output.webm');
        } else {
            console.log(`❌ Speech synthesis failed: ${result.error}`);
        }
        
        // Test 3: Test convenience function
        console.log('\n3. Testing convenience function...');
        const success = await speech.text_to_speech_file(
            "This is a second test using the convenience function.",
            './test_speech_convenience.webm',
            { rate: 0.8, pitch: 1.2 }
        );
        
        if (success) {
            console.log('✅ Convenience function test successful!');
            console.log('📁 Audio saved to: ./test_speech_convenience.webm');
        } else {
            console.log('❌ Convenience function test failed');
        }
        
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

// Run the test
test_speech_synthesis()
    .then(() => {
        console.log('\n🎉 Speech synthesis tests completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });