import { Linking, Share, Alert } from 'react-native';

export const SendMessageHelper = {

  // WhatsApp — opens conversation with pre-filled message (Cameroun +237 prefix)
  async openWhatsApp(phone: string, message: string): Promise<void> {
    const clean = phone.replace(/[^0-9+]/g, '');
    const e164  = clean.startsWith('+') ? clean : `+237${clean}`;
    const url   = `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(
        `whatsapp://send?phone=${e164}&text=${encodeURIComponent(message)}`
      ).catch(() =>
        Alert.alert('WhatsApp non installé', 'Installez WhatsApp pour utiliser cette fonctionnalité.')
      );
    }
  },

  // SMS — opens messaging app with pre-filled body
  async openSms(phone: string, message: string): Promise<void> {
    const clean = phone.replace(/[^0-9+]/g, '');
    await Linking.openURL(
      `sms:${clean}${message ? `?body=${encodeURIComponent(message)}` : ''}`
    ).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir l'application SMS."));
  },

  // Email — extracts Subject line from AI message if present
  async openEmail(email: string, subject: string, body: string): Promise<void> {
    const match = body.match(/^(?:Objet|Subject):\s*(.+)$/m);
    const subj  = match ? match[1].trim() : subject;
    const clean = body.replace(/^(?:Objet|Subject):.*\n/m, '').trim();
    await Linking.openURL(
      `mailto:${email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(clean)}`
    ).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir l'application email."));
  },

  // Social networks — try deep link first, fallback to native share sheet
  async shareToApp(message: string, channel: string): Promise<void> {
    const links: Record<string, string> = {
      facebook:  'fb://composer',
      instagram: 'instagram://camera',
      tiktok:    'snssdk1233://',
      linkedin:  'linkedin://compose',
    };
    const deep = links[channel];
    if (deep && await Linking.canOpenURL(deep)) {
      await Linking.openURL(deep);
      return;
    }
    await Share.share({ message });
  },
};