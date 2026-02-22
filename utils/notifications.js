import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function setupAlarmNotificationChannel() {
  if (Platform.OS === 'android') {
    // Deletar canais antigos para garantir limpeza
    await Notifications.deleteNotificationChannelAsync('alarm-channel');
    await Notifications.deleteNotificationChannelAsync('alarm-channel-high');
    await Notifications.deleteNotificationChannelAsync('alarm-critical-v1');
    await Notifications.deleteNotificationChannelAsync('message-channel');
    
    // Criar novo canal com prioridade máxima e nome distinto - v2
    await Notifications.setNotificationChannelAsync('alarm-critical-v2', {
      name: 'Alarme Crítico',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 1000, 1000, 1000, 1000, 1000, 1000],
      lightColor: '#FF231F7C',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default', 
      bypassDnd: true,
      enableVibrate: true,
      enableLights: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: true,
        }
      }
    });
    
    // Canal de mensagens com som personalizado (fallback para default caso o recurso não exista)
    await Notifications.setNotificationChannelAsync('message-channel', {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
      sound: 'message',
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION_COMMUNICATION_INSTANT,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      }
    });
  }
}

export async function registerForPushNotificationsAsync() {
  await setupAlarmNotificationChannel();

  // Garantir canal de mensagens configurado
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('message-channel', {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
      sound: 'message',
    });
  }

  // Check permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    Alert.alert('Erro', 'Permissão de notificação negada!');
    return false;
  }

  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData?.data;
    if (token) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase.from('profiles').update({ fcm_token: token }).eq('id', user.id);
        }
      } catch {}
    }
  } catch {}

  return true;
}

// Function to schedule a local notification
export async function scheduleLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
        },
        trigger: null, // show immediately
    });
}
