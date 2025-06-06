import {useState, useRef, useEffect, useCallback} from 'react';
import {Alert, Platform, Linking, Animated, Easing} from 'react-native';
import NfcManager, {NfcTech, NfcEvents, TagEvent} from 'react-native-nfc-manager';
import Clipboard from '@react-native-clipboard/clipboard';

NfcManager.start();

const useNfc = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [nfcTagData, setNfcTagData] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState<boolean | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string>('');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanningStep, setScanningStep] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkNfcState();
    const onStateChange = (state: any) => setNfcEnabled(state.state === 'on');
    NfcManager.setEventListener(NfcEvents.StateChanged, onStateChange);
    return () => {
      NfcManager.setEventListener(NfcEvents.StateChanged, null);
      NfcManager.cancelTechnologyRequest().catch(() => {});
      progressAnim.stopAnimation();
    };
  }, []);

  useEffect(() => {
    const listener = progressAnim.addListener(({value}) => setScanProgress(Math.floor(value * 100)));
    return () => progressAnim.removeListener(listener);
  }, [progressAnim]);

  const updateProgress = (target: number, duration = 300) => {
    Animated.timing(progressAnim, {
      toValue: target / 100,
      duration,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease),
    }).start();
  };

  const checkNfcState = useCallback(async () => {
    try {
      const isEnabled = await NfcManager.isEnabled();
      setNfcEnabled(isEnabled);
      return isEnabled;
    } catch {
      setNfcEnabled(false);
      return false;
    }
  }, []);

  const openNfcSettings = () => {
    Alert.alert(
      'NFC Kapalı',
      "NFC özelliği kapalı. Ayarlara gidip NFC'yi açmak istiyor musunuz?",
      [
        {text: 'İptal', style: 'cancel'},
        {
          text: 'Ayarlara Git',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.openSettings();
            } else {
              Linking.openURL('App-Prefs:root=General&path=NFC');
            }
          },
        },
      ],
    );
  };

  // ---- Standart kart etiketi için
  const parseNdefMessage = (ndefMessage: any[]) => {
    if (!ndefMessage || ndefMessage.length === 0) return null;
    const urlInfo: string[] = [];
    const textInfo: string[] = [];
    const parsedRecords = ndefMessage.map((record, index) => {
      const payload = record.payload;
      let text = '';
      let recordType = 'Bilinmiyor';
      if (payload && payload.length > 0) {
        switch (record.tnf) {
          case 1: {
            const typeArray = record.type;
            if (typeArray && typeArray.length > 0) {
              const typeStr = String.fromCharCode(...typeArray);
              switch (typeStr) {
                case 'T': {
                  recordType = 'Metin';
                  const languageCodeLength = payload[0] & 0x3f;
                  text = String.fromCharCode(...payload.slice(1 + languageCodeLength));
                  textInfo.push(text);
                  break;
                }
                case 'U': {
                  recordType = 'URL';
                  const uriPrefix = payload[0];
                  const uriPrefixes = [
                    '', 'http://www.', 'https://www.', 'http://', 'https://',
                    'tel:', 'mailto:', 'ftp://anonymous:anonymous@', 'ftp://ftp.', 'ftps://',
                    'sftp://', 'smb://', 'nfs://', 'ftp://', 'dav://',
                    'news:', 'telnet://', 'imap:', 'rtsp://', 'urn:', 'pop:',
                    'sip:', 'sips:', 'tftp:', 'btspp://', 'btl2cap://', 'btgoep://', 'tcpobex://',
                    'irdaobex://', 'file://', 'urn:epc:id:', 'urn:epc:tag:', 'urn:epc:pat:', 'urn:epc:raw:', 'urn:epc:', 'urn:nfc:',
                  ];
                  text = (uriPrefixes[uriPrefix] || '') + String.fromCharCode(...payload.slice(1));
                  urlInfo.push(text);
                  break;
                }
                default:
                  try {
                    text = `Bilinmeyen Well-Known Tip (${typeStr}): ${String.fromCharCode(...payload)}`;
                  } catch (e) {
                    text = `Bilinmeyen Well-Known Tip (${typeStr})`;
                  }
              }
            }
            break;
          }
          case 2: recordType = 'MIME'; try { text = String.fromCharCode(...payload); } catch { text = "(Payload MIME olarak görüntülenemiyor)"; } break;
          case 4: recordType = 'Harici Tip'; try { text = String.fromCharCode(...payload); } catch { text = "(Payload Harici Tip olarak görüntülenemiyor)"; } break;
          default: try { text = `Bilinmeyen TNF (${record.tnf}): ${String.fromCharCode(...payload)}`; } catch { text = `Bilinmeyen TNF (${record.tnf})`; }
        }
      }
      return {
        id: index, tnf: record.tnf, type: recordType, payload: text,
        payloadLength: payload ? payload.length : 0,
        rawPayload: payload ? Array.from(payload as number[]).map((b: number) => b.toString(16).padStart(2, '0')).join(' ') : '',
      };
    });
    return {
      records: parsedRecords, urlInfo: urlInfo.length > 0 ? urlInfo : undefined,
      textInfo: textInfo.length > 0 ? textInfo : undefined,
    };
  };

  const analyzeTag = (tag: TagEvent) => {
    const ndefData = tag.ndefMessage ? parseNdefMessage(tag.ndefMessage) : null;
    let manufacturer = 'Bilinmiyor'; let technology = 'Bilinmiyor';
    const techTypesCleaned = tag.techTypes?.map(t => t.replace('android.nfc.tech.', '')) || [];
    if (techTypesCleaned.includes(NfcTech.MifareClassic.replace('android.nfc.tech.',''))) { manufacturer = 'NXP'; technology = 'MIFARE Classic'; }
    else if (techTypesCleaned.includes(NfcTech.MifareUltralight.replace('android.nfc.tech.',''))) { manufacturer = 'NXP'; technology = 'MIFARE Ultralight'; }
    else if (techTypesCleaned.includes(NfcTech.IsoDep.replace('android.nfc.tech.',''))) { technology = 'ISO 14443 A/B (IsoDep)'; }
    else if (techTypesCleaned.includes(NfcTech.NfcA.replace('android.nfc.tech.',''))) { technology = 'NFC-A (ISO 14443 Type A)'; }
    else if (techTypesCleaned.includes(NfcTech.NfcB.replace('android.nfc.tech.',''))) { technology = 'NFC-B (ISO 14443 Type B)'; }
    else if (techTypesCleaned.includes(NfcTech.NfcF.replace('android.nfc.tech.',''))) { technology = 'NFC-F (FeliCa)'; manufacturer = 'Sony'; }
    else if (techTypesCleaned.includes(NfcTech.NfcV.replace('android.nfc.tech.',''))) { technology = 'NFC-V (ISO 15693)'; }
    const isWritable = typeof (tag as any).isWritable === 'boolean' ? (tag as any).isWritable : undefined;
    return {
      id: tag.id || 'Bilinmiyor',
      techTypes: techTypesCleaned,
      type: (tag.type || 'Bilinmiyor').replace('android.nfc.tag.', '').replace('android.nfc.tech.',''),
      maxSize: tag.maxSize, isWritable, ndefMessage: ndefData?.records,
      rawData: JSON.stringify(tag, null, 2), urlInfo: ndefData?.urlInfo, textInfo: ndefData?.textInfo,
      size: tag.maxSize, technology,
      manufacturer, serialNumber: tag.id,
      atqa: (tag as any).atqa ? Array.from((tag as any).atqa as Array<number>).map((b: number) => b.toString(16).padStart(2, '0')).join('') : undefined,
      sak: (tag as any).sak ? (tag as any).sak.toString(16).padStart(2, '0') : undefined,
    };
  };

  // ---- Kredi kartı için
  const parseEmvData = (tlv: Uint8Array): {pan?: string, expDate?: string, raw: string} => {
    let pan = '', expDate = '';
    let i = 0;
    const arr = Array.from(tlv);
    while (i < arr.length) {
      const tag1 = arr[i].toString(16).padStart(2, '0');
      let tag = tag1;
      if ((arr[i] & 0x1F) === 0x1F) tag += arr[++i].toString(16).padStart(2, '0');
      i++;
      const len = arr[i++];
      if (tag === '5a') pan = arr.slice(i, i + len).map(b => b.toString(16).padStart(2, '0')).join('').replace(/f*$/, '');
      if (tag === '5f24') {
        const raw = arr.slice(i, i + len).map(b => b.toString(16).padStart(2, '0')).join('');
        expDate = '20' + raw.slice(0,2) + '/' + raw.slice(2,4);
      }
      i += len;
    }
    return {pan, expDate, raw: arr.map(b => b.toString(16).padStart(2, '0')).join('')};
  };

  // ---- Tek fonksiyonda ikisini de dene
  const readAnyCard = async () => {
    const isEnabled = await checkNfcState();
    if (!isEnabled) {
      openNfcSettings();
      return;
    }
    setModalVisible(true);
    setIsScanning(true);
    setNfcTagData(null);
    setIsSuccess(null);
    setLastErrorMessage('');
    progressAnim.setValue(0);
    setScanProgress(0);

    try {
      setScanningStep('Kart aranıyor...');
      updateProgress(10);
      await NfcManager.requestTechnology([
        NfcTech.IsoDep, NfcTech.MifareClassic, NfcTech.MifareUltralight,
        NfcTech.Ndef, NfcTech.NfcA, NfcTech.NfcB, NfcTech.NfcF, NfcTech.NfcV,
      ]);
      updateProgress(25);
      const tag = await NfcManager.getTag();

      // 1. Önce kredi kartı mı deneyelim?
      let emvOkundu = false;
      let emvData: any = null;
      try {
        if (tag && tag.techTypes?.includes('android.nfc.tech.IsoDep')) {
          setScanningStep('Kredi kartı protokolü deneniyor...');
          updateProgress(40);
          const isoDep = NfcManager;
          // Select PPSE
          const ppse = [0x00, 0xA4, 0x04, 0x00, 0x0E, 0x32,0x50,0x41,0x59,0x2E,0x53,0x59,0x53,0x2E,0x44,0x44,0x46,0x30,0x31,0x00];
          let resp = await isoDep.transceive(ppse);
          const hex = (arr: Iterable<unknown> | ArrayLike<unknown>) => Array.from(arr).map(b => (b as number).toString(16).padStart(2, '0')).join('');
          const resph = hex(resp);
          const aidMatch = resph.match(/4f(\w{2})(\w{10,32})/);
          if (aidMatch) {
            const aid = aidMatch[2].match(/.{2}/g)!.map(byte => parseInt(byte, 16));
            const selAid = [0x00,0xA4,0x04,0x00, aid.length, ...aid, 0x00];
            resp = await isoDep.transceive(selAid);
            // GPO
            resp = await isoDep.transceive([0x80,0xA8,0x00,0x00,0x02,0x83,0x00,0x00]);
            // Read Record
            resp = await isoDep.transceive([0x00,0xB2,0x01,0x0C,0x00]);
            emvData = parseEmvData(new Uint8Array(resp));
            if (emvData.pan) emvOkundu = true;
          }
        }
      } catch(e) {
        // EMV hatalıysa devam, normal kart olarak göster
      }

      if (emvOkundu) {
        setNfcTagData({
          id: tag?.id || 'Bilinmiyor',
          techTypes: tag?.techTypes || [],
          type: 'EMV Credit Card',
          manufacturer: 'EMV',
          technology: 'IsoDep',
          rawData: emvData.raw,
          pan: emvData.pan,
          expDate: emvData.expDate,
        });
        setIsSuccess(true);
        setScanningStep('Kart okundu!');
        updateProgress(100, 400);
        return;
      }

      // 2. Standart NFC kart etiketi olarak göster
      setScanningStep('Kart etiketi analiz ediliyor...');
      updateProgress(70);
      let finalTagData = tag ? analyzeTag(tag) : null;
      setNfcTagData(finalTagData);
      setIsSuccess(true);
      setScanningStep('Tarama tamamlandı!');
      updateProgress(100, 400);
    } catch (error: any) {
      progressAnim.stopAnimation();
      updateProgress(scanProgress);
      setIsSuccess(false);
      const errorMessage = error.message || error.toString();
      const userCancelled = errorMessage.includes('cancelled') || errorMessage.includes('closed');
      setLastErrorMessage(userCancelled ? 'Tarama iptal edildi.' : `Tarama başarısız: ${errorMessage}`);
      setScanningStep(userCancelled ? 'İptal edildi.' : 'Hata oluştu.');
    } finally {
      setTimeout(() => setIsScanning(false), isSuccess !== null ? (isSuccess ? 800 : 500) : 200);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  };

  const cancelScanning = () => {
    setIsScanning(false);
    setScanningStep('İptal ediliyor...');
    progressAnim.stopAnimation();
    NfcManager.cancelTechnologyRequest().catch(() => {});
  };

  const copyToClipboard = (text?: string) => {
    if (text === undefined || text === null) {
      Alert.alert('Hata', 'Kopyalanacak veri bulunamadı.', [{text: 'Tamam'}]);
      return;
    }
    Clipboard.setString(text);
    Alert.alert('Başarılı', 'Veri panoya kopyalandı!', [{text: 'Tamam'}]);
  };

  const closeModal = () => {
    if(isScanning) cancelScanning();
    setModalVisible(false);
  };

  return {
    nfcEnabled, isScanning, modalVisible, nfcTagData, isSuccess,
    readAnyCard, openNfcSettings, closeModal, cancelScanning,
    scanningStep, scanProgress, progressAnim, lastErrorMessage,
    copyToClipboard,
  };
};

export default useNfc;
