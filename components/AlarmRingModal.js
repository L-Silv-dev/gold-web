import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const AlarmRingModal = ({ visible, onClose }) => {
  const [sound, setSound] = useState(null);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds

  // Sound URL - using a reliable alarm sound source
  // If this URL fails, we should have a fallback, but for now we use this.
  // Using a standard loud alarm clock sound effect
  const ALARM_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2197/2197-preview.mp3';

  useEffect(() => {
    let timer;
    let soundObject;
    let vibrationInterval;

    const startAlarm = async () => {
      if (visible) {
        console.log('Iniciando som do alarme no Modal...');
        try {
          // Configure audio session
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });

          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: ALARM_SOUND_URL },
            { shouldPlay: true, isLooping: true, volume: 1.0 }
          );
          
          soundObject = newSound;
          setSound(newSound);

        } catch (error) {
          console.error('Erro ao tocar som do alarme, usando vibração como fallback:', error);
          // Fallback: Vibração se o som falhar (ex: sem internet)
          // Vibra por 1s, para 0.5s, repete
          const ONE_SECOND_IN_MS = 1000;
          const PATTERN = [0, 1000, 500];
          
          Vibration.vibrate(PATTERN, true); // true = repeat
        }

        // Start countdown regardless of sound success
        timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              handleStop(); // Auto stop after 3 minutes
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };

    if (visible) {
      startAlarm();
    }

    return () => {
      if (soundObject) {
        soundObject.unloadAsync();
      }
      Vibration.cancel(); // Stop vibration
      if (timer) clearInterval(timer);
      setTimeLeft(180); // Reset time when closed
    };
  }, [visible]);

  const handleStop = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (err) {
        console.log('Error unloading sound', err);
      }
    }
    Vibration.cancel();
    onClose();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleStop} // Android back button
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <MaterialCommunityIcons name="alarm-bell" size={120} color="#FFF" style={styles.icon} />
          
          <Text style={styles.title}>ALARME</Text>
          <Text style={styles.message}>Hora de acordar!</Text>
          
          <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
          
          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.stopButtonText}>PARAR ALARME</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF231F7C', // Deep Purple/Blue background
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  icon: {
    marginBottom: 40,
    // Add a pulsing animation effect if possible in future
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
    letterSpacing: 2,
  },
  message: {
    fontSize: 24,
    color: '#E0E0E0',
    marginBottom: 60,
  },
  timer: {
    fontSize: 18,
    color: '#AAA',
    marginBottom: 40,
  },
  stopButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 50,
    width: width * 0.8,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  stopButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default AlarmRingModal;
