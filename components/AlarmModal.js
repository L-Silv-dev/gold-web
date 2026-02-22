import React from 'react';
import { Modal, View, TouchableOpacity, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import styles from '../styles/AppStyles';
import { useThemeContext } from '../contexts/ThemeContext';

const AlarmModal = ({
  showAlarmModal,
  setShowAlarmModal,
  currentAlarmTime,
  setCurrentAlarmTime,
  scheduleAlarm,
  setNotes,
  setActiveTab,
  formatAlarmTime
}) => {
  const { theme } = useThemeContext();

  return (
    <Modal
      visible={showAlarmModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAlarmModal(false)}
    >
      <View style={styles.alarmModalContainer}>
        <DateTimePicker
          value={currentAlarmTime}
          mode="time"
          is24Hour
          display="default"
          onChange={async (event, selectedDate) => {
            if (event.type === 'set' && selectedDate) {
              setCurrentAlarmTime(selectedDate);
              const notificationId = await scheduleAlarm(selectedDate);
              if (notificationId) {
                setNotes((prevNotes) => [
                  ...prevNotes,
                  {
                    id: Date.now(),
                    type: 'alarm',
                    content: `Alarme para ${formatAlarmTime(selectedDate)}`,
                    time: selectedDate,
                    isEnabled: true,
                    notificationId: notificationId,
                  },
                ]);
                setActiveTab('alarms');
              }
              setShowAlarmModal(false);
            }
          }}
          accessibilityLabel="Seletor de horário"
          textColor={theme.text}
        />
      </View>
    </Modal>
  );
};

export default AlarmModal; 