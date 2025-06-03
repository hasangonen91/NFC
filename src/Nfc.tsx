import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
  Platform,
  Dimensions,
  Animated,
  StatusBar,
  Modal,
  Easing,
  SafeAreaView,
} from 'react-native';
import NfcManager, {
  NfcTech,
  NfcEvents,
  TagEvent,
} from 'react-native-nfc-manager';
import Clipboard from '@react-native-clipboard/clipboard';
import LottieView from 'lottie-react-native';
import {styles} from './styles';
const {height} = Dimensions.get('window');

NfcManager.start();

// --- YENİ EKLENENLER BAŞLANGIÇ ---

enum CardCategory {
  EMV = 'Kredi/Banka Kartı (EMV)',
  ISTANBULKART = 'İstanbulkart',
  YEMEK_KARTI = 'Yemek Kartı',
  PERSONEL_KARTI = 'Personel Kartı',
  OTHER_MIFARE = 'Diğer MIFARE Kart',
  NDEF_TAG = 'NDEF Etiket',
  UNKNOWN = 'Bilinmeyen Kart Tipi',
}

const AIDS = {
  PPSE: '325041592E5359532E4444463031', // 2PAY.SYS.DDF01
  VISA_DEBIT_CREDIT: 'A0000000031010',
  MASTERCARD_CREDIT_DEBIT: 'A0000000041010',
  MAESTRO: 'A0000000043060',
  AMERICAN_EXPRESS: 'A00000002501',
};

// Hex string'i byte array'e çevirir
function hexStringToByteArray(hexString: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substr(i, 2), 16));
  }
  return bytes;
}

// APDU yanıtının başarılı olup olmadığını kontrol eder (SW1 SW2 = 90 00)
function checkResponse(response: Uint8Array | number[]): boolean {
  const arr = response instanceof Uint8Array ? Array.from(response) : response;
  return (
    arr.length >= 2 &&
    arr[arr.length - 2] === 0x90 &&
    arr[arr.length - 1] === 0x00
  );
}

// Track 2 verisini ayrıştırır
function parseTrack2(track2Hex: string): {
  cardNumber: string;
  expiryDate: string;
} {
  const track2String = track2Hex.replace(/F$/i, '').replace(/f$/, ''); // Sondaki F veya f'yi kaldır
  let separatorIndex = track2String.indexOf('D');
  if (separatorIndex === -1) separatorIndex = track2String.indexOf('d');

  if (separatorIndex === -1 || track2String.length < separatorIndex + 5) {
    // Geçersiz format, ham veriyi veya bir hata mesajı döndür
    console.warn('Invalid Track 2 format:', track2String);
    return {cardNumber: `Invalid T2: ${track2String}`, expiryDate: 'N/A'};
  }

  const cardNumber = track2String.substring(0, separatorIndex);
  const expiryDatePart = track2String.substring(
    separatorIndex + 1,
    separatorIndex + 5,
  ); // YYMM
  return {
    cardNumber: formatPan(cardNumber),
    expiryDate: `${expiryDatePart.substring(2, 4)}/${expiryDatePart.substring(
      0,
      2,
    )}`, // MM/YY
  };
}

// PAN'ı maskeler (örn: 5555-****-****-1234)
function formatPan(pan: string): string {
  if (!pan || typeof pan !== 'string') return 'N/A';
  const cleanedPan = pan.replace(/\D/g, ''); // Sadece rakamları al
  if (cleanedPan.length > 8) {
    return `${cleanedPan.substring(0, 4)}-****-****-${cleanedPan.substring(
      cleanedPan.length - 4,
    )}`;
  } else if (cleanedPan.length > 0) {
    return cleanedPan; // Kısa PAN'ları olduğu gibi göster
  }
  return 'N/A';
}

// PAN'a göre kart kuruluşunu belirler
function determineIssuerFromPan(pan: string, aidHex?: string): string {
  if (!pan || typeof pan !== 'string') return 'Bilinmiyor (EMV)';
  const firstDigit = pan.charAt(0);
  const firstTwo = pan.substring(0, 2);
  const firstFour = pan.substring(0, 4);

  if (aidHex === AIDS.VISA_DEBIT_CREDIT || firstDigit === '4') return 'Visa';
  if (
    aidHex === AIDS.MASTERCARD_CREDIT_DEBIT ||
    (parseInt(firstTwo) >= 51 && parseInt(firstTwo) <= 55) ||
    (parseInt(firstFour) >= 2221 && parseInt(firstFour) <= 2720)
  )
    return 'Mastercard';
  if (
    aidHex === AIDS.AMERICAN_EXPRESS ||
    firstTwo === '34' ||
    firstTwo === '37'
  )
    return 'American Express';
  if (aidHex === AIDS.MAESTRO) return 'Maestro';

  return 'Diğer EMV Kartı';
}

// Basit TLV ayrıştırıcı
function parseTlv(data: Uint8Array | number[]): {[key: string]: string} {
  const tlv: {[key: string]: string} = {};
  let i = 0;
  const arr = data instanceof Uint8Array ? Array.from(data) : data;

  while (i < arr.length) {
    let tagStr = arr[i].toString(16).toUpperCase().padStart(2, '0');
    let tagValue = arr[i];
    i++;
    if ((tagValue & 0x1f) === 0x1f) {
      // Çok byte'lı tag kontrolü
      if (i < arr.length) {
        // Sınır kontrolü
        tagStr += arr[i].toString(16).toUpperCase().padStart(2, '0');
        i++;
      } else {
        break;
      } // Veri bitti
    }

    if (i >= arr.length) break; // Uzunluk byte'ı için sınır kontrolü
    let len = arr[i];
    i++;
    if (len > 127) {
      // Çok byte'lı uzunluk
      const lenBytes = len & 0x7f;
      if (i + lenBytes > arr.length) break; // Değer byte'ları için sınır kontrolü
      len = 0;
      for (let k = 0; k < lenBytes; k++) {
        len = (len << 8) | arr[i];
        i++;
      }
    }
    if (i + len > arr.length) break; // Değer byte'ları için sınır kontrolü
    const valueBytes = arr.slice(i, i + len);
    tlv[tagStr] = Array.from(valueBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    i += len;
  }
  return tlv;
}

// Hex'i ASCII'ye çevirir
function hexToAscii(hex: string): string {
  let str = '';
  if (!hex || hex.length % 2 !== 0) return ''; // Geçersiz hex
  try {
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
  } catch (e) {
    console.error('Hex to ASCII conversion error', e);
    return ''; // Hata durumunda boş string
  }
  return str;
}

// --- YENİ EKLENENLER BİTİŞ ---

interface CreditCardData {
  cardNumber?: string;
  expiryDate?: string;
  cardholderName?: string; // Eklendi
  issuer?: string;
  // currency?: string; // Şimdilik çıkarıldı, elde etmesi daha karmaşık
}
interface NfcTagData {
  id: string;
  techTypes: string[];
  type: string;
  maxSize?: number;
  isWritable?: boolean;
  ndefMessage?: any[];
  rawData?: string; // Tag'in ham JSON verisi
  creditCardInfo?: CreditCardData; // EMV kart bilgileri
  contactInfo?: any;
  wifiInfo?: any;
  urlInfo?: string[];
  textInfo?: string[];
  size?: number;
  technology?: string;
  manufacturer?: string;
  serialNumber?: string;
  atqa?: string;
  sak?: string;
  // --- YENİ EKLENENLER ---
  cardCategory?: CardCategory;
  istanbulkartBalance?: string;
  // mealCardInfo?: { issuer?: string; balance?: string }; // İleride eklenebilir
  // employeeCardInfo?: { issuer?:string; details?: string }; // İleride eklenebilir
}

const Nfc = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [nfcTagData, setNfcTagData] = useState<NfcTagData | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState<boolean | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanningStep, setScanningStep] = useState('');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkNfcState();
    const onStateChange = (state: any) => {
      setNfcEnabled(state.state === 'on');
    };
    NfcManager.setEventListener(NfcEvents.StateChanged, onStateChange);
    return () => {
      NfcManager.setEventListener(NfcEvents.StateChanged, null);
      NfcManager.cancelTechnologyRequest().catch(() => {});
      progressAnim.stopAnimation();
      modalAnim.stopAnimation();
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const listener = progressAnim.addListener(({value}) => {
      setScanProgress(Math.floor(value * 100));
    });
    return () => progressAnim.removeListener(listener);
  }, [progressAnim]);

  useEffect(() => {
    if (modalVisible) {
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisible, modalAnim]);

  // Progress bar'ı manuel olarak güncelleyen fonksiyon
  const updateProgress = (targetProgress: number) => {
    Animated.timing(progressAnim, {
      toValue: targetProgress / 100,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease),
    }).start();
  };

  const sendEMVApdu = async (apdu: number[]): Promise<Uint8Array | null> => {
    try {
      // @ts-ignore
      const resp = await NfcManager.transceive(apdu);
      // Android'de number[] dönebilir, Uint8Array'e çevir
      return resp instanceof Uint8Array ? resp : new Uint8Array(resp);
    } catch (e) {
      console.warn(
        'APDU transceive error:',
        e,
        'APDU:',
        apdu.map(b => b.toString(16).padStart(2, '0')).join(''),
      );
      return null;
    }
  };

  // --- DEĞİŞTİRİLEN FONKSİYON: parseEmvCardInfo ---
  const parseEmvCardInfo = async (): Promise<CreditCardData | undefined> => {
    try {
      // 1. PPSE Seçimi
      setScanningStep('PPSE seçiliyor...');
      updateProgress(30);
      const selectPpseApdu = [
        0x00,
        0xa4,
        0x04,
        0x00,
        0x0e,
        ...hexStringToByteArray(AIDS.PPSE),
        0x00,
      ];
      let response = await sendEMVApdu(selectPpseApdu);

      // PPSE yanıtından AID'leri ayrıştırmak yerine şimdilik bilinen AID'leri deneyeceğiz.
      // Gerçek bir uygulamada PPSE yanıtındaki (Tag '4F') AID'ler okunmalıdır.
      const aidsToTry = [
        AIDS.VISA_DEBIT_CREDIT,
        AIDS.MASTERCARD_CREDIT_DEBIT,
        AIDS.AMERICAN_EXPRESS,
        AIDS.MAESTRO,
      ];

      let aidIndex = 0;
      for (const aidHex of aidsToTry) {
        setScanningStep(
          `${determineIssuerFromPan('', aidHex)} uygulaması seçiliyor...`,
        );
        updateProgress(40 + aidIndex * 15); // Her AID için progress arttır
        const aidBytes = hexStringToByteArray(aidHex);
        const selectAidApdu = [
          0x00,
          0xa4,
          0x04,
          0x00,
          aidBytes.length,
          ...aidBytes,
          0x00,
        ];
        response = await sendEMVApdu(selectAidApdu);

        if (response && checkResponse(response)) {
          // AID başarıyla seçildi. Şimdi GPO (Get Processing Options) deneyelim.
          setScanningStep('İşlem seçenekleri alınıyor (GPO)...');
          updateProgress(70);
          const gpoApdu = [0x80, 0xa8, 0x00, 0x00, 0x02, 0x83, 0x00, 0x00];
          let gpoResponse = await sendEMVApdu(gpoApdu);

          // READ RECORD denemesi
          for (let sfi = 1; sfi <= 4; sfi++) {
            setScanningStep(`Kayıt okunuyor (SFI: ${sfi})...`);
            updateProgress(75 + sfi * 5);
            const readRecordApdu = [0x00, 0xb2, 0x01, (sfi << 3) | 0x04, 0x00];
            let recordResponse = await sendEMVApdu(readRecordApdu);

            if (recordResponse && checkResponse(recordResponse)) {
              const tlvData = parseTlv(recordResponse.slice(0, -2));
              const track2Hex = tlvData['57'];
              const cardholderNameHex = tlvData['5F20'];

              if (track2Hex) {
                const {cardNumber, expiryDate} = parseTrack2(track2Hex);
                const issuer = determineIssuerFromPan(cardNumber, aidHex);
                const cardholderName = cardholderNameHex
                  ? hexToAscii(cardholderNameHex).trim()
                  : undefined;

                updateProgress(95);
                return {cardNumber, expiryDate, issuer, cardholderName};
              }
            }
          }
        }
        aidIndex++;
      }
    } catch (error) {
      console.error('EMV Kart bilgisi ayrıştırma hatası:', error);
    }
    return undefined;
  };

  const readMifareClassicSector = async (): Promise<
    {rawData: string; balance?: string} | undefined
  > => {
    try {
      setScanningStep('MIFARE Classic kimlik doğrulaması...');
      updateProgress(40);

      const MIFARE_KEY_DEFAULT = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]; // Default MIFARE key
      // Replace with a valid implementation or remove if not supported
      console.warn(
        'authenticateSectorWithKeyA is not supported. Implement custom authentication logic if needed.',
      );

      setScanningStep('MIFARE Classic veri okunuyor...');
      updateProgress(70);

      // @ts-ignore
      const blockData = await NfcManager.readBlock(4);

      if (blockData && blockData.length > 0) {
        updateProgress(90);
        const rawData = Array.from(blockData as Uint8Array)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');

        return {
          rawData: rawData,
          balance: blockData[0] ? `${blockData[0]} TL (Örnek)` : undefined,
        };
      }
    } catch (e) {
      console.warn('Mifare Classic sektör okuma hatası:', e);
      return undefined;
    }
    return undefined;
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

  const parseNdefMessage = (ndefMessage: any[]) => {
    if (!ndefMessage || ndefMessage.length === 0) return null;
    const urlInfo: string[] = [];
    const textInfo: string[] = [];
    let contactInfo: any = null;
    let wifiInfo: any = null;

    const parsedRecords = ndefMessage.map((record, index) => {
      const payload = record.payload;
      let text = '';
      let recordType = 'Bilinmiyor';
      if (payload && payload.length > 0) {
        switch (record.tnf) {
          case 1:
            const typeArray = record.type;
            if (typeArray && typeArray.length > 0) {
              const typeStr = String.fromCharCode(...typeArray);
              switch (typeStr) {
                case 'T':
                  recordType = 'Metin';
                  const languageCodeLength = payload[0] & 0x3f;
                  text = String.fromCharCode(
                    ...payload.slice(1 + languageCodeLength),
                  );
                  textInfo.push(text);
                  break;
                case 'U':
                  recordType = 'URL';
                  const uriPrefix = payload[0];
                  const uriPrefixes = [
                    '',
                    'http://www.',
                    'https://www.',
                    'http://',
                    'https://',
                    'tel:',
                    'mailto:',
                    'ftp://anonymous:anonymous@',
                    'ftp://ftp.',
                    'ftps://',
                    'sftp://',
                    'smb://',
                    'nfs://',
                    'ftp://',
                    'dav://',
                    'news:',
                    'telnet://',
                    'imap:',
                    'rtsp://',
                    'urn:',
                    'pop:',
                    'sip:',
                    'sips:',
                    'tftp:',
                    'btspp://',
                    'btl2cap://',
                    'btgoep://',
                    'tcpobex://',
                    'irdaobex://',
                    'file://',
                    'urn:epc:id:',
                    'urn:epc:tag:',
                    'urn:epc:pat:',
                    'urn:epc:raw:',
                    'urn:epc:',
                    'urn:nfc:',
                  ];
                  text =
                    (uriPrefixes[uriPrefix] || '') +
                    String.fromCharCode(...payload.slice(1));
                  urlInfo.push(text);
                  break;
                default:
                  text = String.fromCharCode(...payload);
              }
            }
            break;
          case 2:
            recordType = 'MIME';
            text = String.fromCharCode(...payload);
            break;
          case 4:
            recordType = 'Harici';
            text = String.fromCharCode(...payload);
            break;
          default:
            text = String.fromCharCode(...payload);
        }
      }
      return {
        id: index,
        tnf: record.tnf,
        type: recordType,
        payload: text,
        payloadLength: payload ? payload.length : 0,
        rawPayload: payload
          ? Array.from(payload as number[])
              .map((b: number) => b.toString(16).padStart(2, '0'))
              .join(' ')
          : '',
      };
    });

    return {
      records: parsedRecords,
      urlInfo: urlInfo.length > 0 ? urlInfo : undefined,
      textInfo: textInfo.length > 0 ? textInfo : undefined,
      contactInfo,
      wifiInfo,
    };
  };

  const analyzeTag = (tag: TagEvent): NfcTagData => {
    const ndefData = tag.ndefMessage ? parseNdefMessage(tag.ndefMessage) : null;

    let manufacturer = 'Bilinmiyor';
    let technology = 'Bilinmiyor';

    if (tag.techTypes) {
      if (tag.techTypes.includes('android.nfc.tech.MifareClassic')) {
        manufacturer = 'NXP';
        technology = 'MIFARE Classic';
      } else if (tag.techTypes.includes('android.nfc.tech.MifareUltralight')) {
        manufacturer = 'NXP';
        technology = 'MIFARE Ultralight';
      } else if (tag.techTypes.includes('android.nfc.tech.IsoDep')) {
        technology = 'ISO 14443 Type A/B (IsoDep)';
      } else if (tag.techTypes.includes('android.nfc.tech.NfcA')) {
        technology = 'NFC-A (ISO 14443 Type A)';
      } else if (tag.techTypes.includes('android.nfc.tech.NfcB')) {
        technology = 'NFC-B (ISO 14443 Type B)';
      } else if (tag.techTypes.includes('android.nfc.tech.NfcF')) {
        technology = 'NFC-F (FeliCa)';
        manufacturer = 'Sony';
      } else if (tag.techTypes.includes('android.nfc.tech.NfcV')) {
        technology = 'NFC-V (ISO 15693)';
      }
    }

    const isWritable =
      typeof (tag as any).isWritable === 'boolean'
        ? (tag as any).isWritable
        : undefined;

    return {
      id: tag.id || 'Bilinmiyor',
      techTypes: tag.techTypes || [],
      type: tag.type || 'Bilinmiyor',
      maxSize: tag.maxSize,
      isWritable,
      ndefMessage: ndefData?.records,
      rawData: JSON.stringify(tag, null, 2),
      urlInfo: ndefData?.urlInfo,
      textInfo: ndefData?.textInfo,
      contactInfo: ndefData?.contactInfo,
      wifiInfo: ndefData?.wifiInfo,
      size: tag.maxSize,
      technology,
      manufacturer,
      serialNumber: tag.id,
      atqa: (tag as any).atqa
        ? Array.from((tag as any).atqa as Array<number>)
            .map((b: number) => b.toString(16).padStart(2, '0'))
            .join('')
        : undefined,
      sak: (tag as any).sak
        ? (tag as any).sak.toString(16).padStart(2, '0')
        : undefined,
    };
  };

  // --- DEĞİŞTİRİLEN FONKSİYON: readNfcTag ---
  const readNfcTag = async () => {
    try {
      const isEnabled = await checkNfcState();
      if (!isEnabled) {
        openNfcSettings();
        return;
      }

      setModalVisible(true);
      setIsScanning(true);
      setScanProgress(0);
      setNfcTagData(null);
      setIsSuccess(null);
      setScanningStep('NFC cihazı aranıyor...');
      updateProgress(5);
      await new Promise(resolve => setTimeout(resolve, 100));

      setScanningStep('NFC teknolojisi isteniyor...');
      updateProgress(10);
      await NfcManager.requestTechnology([
        NfcTech.IsoDep,
        NfcTech.MifareClassic,
        NfcTech.MifareUltralight,
        NfcTech.Ndef,
        NfcTech.NfcA,
        NfcTech.NfcB,
        NfcTech.NfcF,
        NfcTech.NfcV,
      ]);

      setScanningStep('Etiket bekleniyor...');
      updateProgress(20);
      const tag: TagEvent | null = await NfcManager.getTag();

      if (!tag) {
        throw new Error('Etiket bulunamadı veya okunamadı.');
      }

      setScanningStep('Etiket verileri analiz ediliyor...');
      updateProgress(25);
      let finalTagData: NfcTagData = analyzeTag(tag);

      let detectedCardCategory: CardCategory = CardCategory.UNKNOWN;
      let emvData: CreditCardData | undefined = undefined;
      let mifareCardData: {rawData: string; balance?: string} | undefined =
        undefined;

      // 1. IsoDep (EMV Kartı) Kontrolü
      if (tag.techTypes?.includes(NfcTech.IsoDep)) {
        setScanningStep('EMV kart bilgileri okunuyor...');
        emvData = await parseEmvCardInfo();
        if (
          emvData &&
          emvData.cardNumber &&
          !emvData.cardNumber.startsWith('Invalid')
        ) {
          detectedCardCategory = CardCategory.EMV;
          finalTagData.creditCardInfo = emvData;
        } else {
          setScanningStep(
            'EMV bilgisi tam okunamadı, diğer teknolojiler kontrol ediliyor...',
          );
          updateProgress(30);
        }
      }

      // 2. MifareClassic (İstanbulkart, Yemek Kartı vb.) Kontrolü
      if (
        detectedCardCategory === CardCategory.UNKNOWN &&
        tag.techTypes?.includes(NfcTech.MifareClassic)
      ) {
        setScanningStep('MIFARE Classic kart verisi okunuyor...');
        mifareCardData = await readMifareClassicSector();
        if (mifareCardData) {
          updateProgress(95);
          if (mifareCardData.balance) {
            detectedCardCategory = CardCategory.ISTANBULKART;
            finalTagData.istanbulkartBalance = mifareCardData.balance;
            finalTagData.textInfo = [
              ...(finalTagData.textInfo || []),
              `MIFARE Ham Veri (Sektör 1, Blok 4): ${mifareCardData.rawData}`,
            ];
            if (mifareCardData.balance) {
              finalTagData.textInfo.push(
                `Tahmini Bakiye: ${mifareCardData.balance}`,
              );
            }
          } else {
            detectedCardCategory = CardCategory.OTHER_MIFARE;
            finalTagData.textInfo = [
              ...(finalTagData.textInfo || []),
              `MIFARE Ham Veri (Sektör 1, Blok 4): ${mifareCardData.rawData}`,
            ];
          }
        }
      }

      // 3. NDEF Etiketi Kontrolü
      if (
        detectedCardCategory === CardCategory.UNKNOWN &&
        finalTagData.ndefMessage &&
        finalTagData.ndefMessage.length > 0
      ) {
        detectedCardCategory = CardCategory.NDEF_TAG;
        updateProgress(95);
      }

      finalTagData.cardCategory = detectedCardCategory;
      setNfcTagData(finalTagData);
      setIsSuccess(true);
      setScanningStep('Tarama tamamlandı!');
      updateProgress(100);
    } catch (error: any) {
      console.warn('readNfcTag error:', error);
      setIsSuccess(false);
      // setNfcTagData(null); // Hata durumunda null kalsın veya kısmi veri gösterilsin
      setScanningStep(`Tarama başarısız: ${error.message || error.toString()}`);
      if (error?.toString?.().includes('cancelled')) {
        // Kullanıcı iptal ettiyse modalı hemen kapatma, mesaj göster
      }
    } finally {
      progressAnim.stopAnimation();
      // isSuccess durumuna göre progress bar'ı ayarla (setNfcTagData'dan sonra)
      // Bu kısım biraz gecikmeli çalışabilir, state güncellemeleri asenkron olduğu için.
      // En iyisi isSuccess'ı useEffect ile takip edip progress'i orada %100 yapmak.
      // Şimdilik direkt set edelim:
      setScanProgress(
        isSuccess === true ? 100 : isSuccess === false ? scanProgress : 0,
      );

      setTimeout(
        () => {
          setIsScanning(false); // Animasyonların bitmesi için biraz bekle
        },
        isSuccess !== null ? 2000 : 200,
      ); // Eğer sonuç varsa uzun bekle, yoksa kısa

      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
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
    setModalVisible(false);
    // Bu değerleri modal kapandığında sıfırlamak daha iyi olabilir
    // setNfcTagData(null);
    // setIsSuccess(null);
    // setScanProgress(0);
    // setScanningStep('');
  };

  const cancelScanning = () => {
    // setIsScanning(false); // readNfcTag > finally içinde zaten yapılıyor
    setScanningStep('İptal ediliyor...');
    progressAnim.stopAnimation(); // Animasyonu durdur
    NfcManager.cancelTechnologyRequest().catch(err => {
      console.log('Cancel request error', err);
    }); // NFC işlemini iptal et
    // setScanProgress(0); // Progress'i sıfırla
    // setTimeout(() => setModalVisible(false), 250); // Hemen kapatma, readNfcTag finally halletsin
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔍 NFC Kart Okuyucu</Text>
          <Text style={styles.subtitle}>
            Kartları ve etiketleri detaylı analiz edin
          </Text>
        </View>

        {nfcEnabled === false && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>NFC Kapalı</Text>
            <Text style={styles.warningSubtext}>
              NFC özelliğini açmanız gerekiyor
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={openNfcSettings}>
              <Text style={styles.settingsButtonText}>⚙️ Ayarlara Git</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.scanSection}>
          <TouchableOpacity
            style={[
              styles.scanButton,
              (nfcEnabled === false || isScanning) && styles.scanButtonDisabled,
            ]}
            onPress={readNfcTag}
            disabled={nfcEnabled === false || isScanning}>
            <Text style={styles.scanButtonIcon}>📱</Text>
            <Text style={styles.scanButtonText}>NFC Kart Tara</Text>
            <Text style={styles.scanButtonSubtext}>
              Kartınızı veya etiketi yaklaştırın
            </Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={modalVisible} // Artık modalVisible ile kontrol ediliyor
          transparent
          animationType="none"
          onRequestClose={() => {
            if (!isScanning) closeModal(); // Tarama sırasında kapatmayı engelle
          }}>
          <Animated.View
            style={[
              styles.bottomModalBackground,
              {
                opacity: modalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}>
            <Animated.View
              style={[
                styles.bottomModal,
                {
                  transform: [
                    {
                      translateY: modalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [height, 0],
                      }),
                    },
                  ],
                },
              ]}>
              <TouchableOpacity
                style={styles.modalDragBarContainer}
                onPress={isScanning ? undefined : closeModal}
                activeOpacity={1}>
                <View style={styles.modalDragBar} />
              </TouchableOpacity>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalContent}>
                {isScanning && !nfcTagData ? ( // Tarama sırasında ve henüz veri yokken göster
                  <View
                    style={{
                      alignItems: 'center',
                      paddingTop: 24,
                      paddingBottom: 24,
                    }}>
                    <View style={styles.scanAnimContainer}>
                      <LottieView
                        source={require('./assets/nfc-scan.json')}
                        autoPlay
                        loop
                        style={styles.scanAnim}
                      />
                    </View>
                    <Text style={styles.scanningText}>📱 NFC Taranıyor</Text>
                    <Text style={styles.scanningStep}>{scanningStep}</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarBG}>
                        <Animated.View
                          style={[
                            styles.progressBarFill,
                            {
                              width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                              }),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>{scanProgress}%</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={cancelScanning}>
                      <Text style={styles.cancelButtonText}>❌ İptal Et</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Sonuç Ekranı (isScanning false olduğunda veya nfcTagData geldiğinde) */}
                    {nfcTagData &&
                      isSuccess !== null && ( // Sadece veri ve sonuç varsa göster
                        <View>
                          <View style={styles.modalHeader}>
                            <LottieView
                              source={
                                isSuccess
                                  ? require('./assets/success.json')
                                  : require('./assets/failure.json')
                              }
                              autoPlay
                              loop={false}
                              style={styles.resultAnim}
                            />
                            <Text
                              style={[
                                styles.modalTitle,
                                {color: isSuccess ? '#22c55e' : '#ef4444'},
                              ]}>
                              {isSuccess
                                ? '✅ Tarama Başarılı!'
                                : `❌ ${
                                    scanningStep.includes('başarısız')
                                      ? scanningStep
                                      : 'Tarama Başarısız!'
                                  }`}
                            </Text>
                          </View>
                          {isSuccess &&
                            nfcTagData && ( // Sadece başarılıysa ve veri varsa detayları göster
                              <View style={styles.dataContainer}>
                                {/* Kart Kategorisi */}
                                {nfcTagData.cardCategory && (
                                  <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>
                                      💳 Kart Tipi/Kategorisi
                                    </Text>
                                    <DataRow
                                      label="🏷️ Kategori"
                                      value={nfcTagData.cardCategory}
                                    />
                                  </View>
                                )}

                                {/* EMV Kart Bilgileri */}
                                {nfcTagData.cardCategory === CardCategory.EMV &&
                                  nfcTagData.creditCardInfo && (
                                    <View style={styles.section}>
                                      <Text style={styles.sectionTitle}>
                                        🏦 Kredi/Banka Kartı Detayları
                                      </Text>
                                      {nfcTagData.creditCardInfo.cardNumber && (
                                        <DataRow
                                          label="🔢 Kart Numarası"
                                          value={
                                            nfcTagData.creditCardInfo.cardNumber
                                          }
                                          onCopy={() =>
                                            copyToClipboard(
                                              nfcTagData.creditCardInfo!
                                                .cardNumber!,
                                            )
                                          }
                                        />
                                      )}
                                      {nfcTagData.creditCardInfo.expiryDate && (
                                        <DataRow
                                          label="🗓️ Son Kul. Tarihi"
                                          value={
                                            nfcTagData.creditCardInfo.expiryDate
                                          }
                                          onCopy={() =>
                                            copyToClipboard(
                                              nfcTagData.creditCardInfo!
                                                .expiryDate!,
                                            )
                                          }
                                        />
                                      )}
                                      {nfcTagData.creditCardInfo.issuer && (
                                        <DataRow
                                          label="🏢 Kart Kuruluşu"
                                          value={
                                            nfcTagData.creditCardInfo.issuer
                                          }
                                          onCopy={() =>
                                            copyToClipboard(
                                              nfcTagData.creditCardInfo!
                                                .issuer!,
                                            )
                                          }
                                        />
                                      )}
                                      {nfcTagData.creditCardInfo
                                        .cardholderName && (
                                        <DataRow
                                          label="🧑 Kart Sahibi"
                                          value={
                                            nfcTagData.creditCardInfo
                                              .cardholderName
                                          }
                                          onCopy={() =>
                                            copyToClipboard(
                                              nfcTagData.creditCardInfo!
                                                .cardholderName!,
                                            )
                                          }
                                          multiline
                                        />
                                      )}
                                    </View>
                                  )}

                                {/* İstanbulkart Bilgileri */}
                                {nfcTagData.cardCategory ===
                                  CardCategory.ISTANBULKART &&
                                  nfcTagData.istanbulkartBalance && (
                                    <View style={styles.section}>
                                      <Text style={styles.sectionTitle}>
                                        🚌 İstanbulkart Bilgileri
                                      </Text>
                                      <DataRow
                                        label="💰 Tahmini Bakiye"
                                        value={nfcTagData.istanbulkartBalance}
                                        onCopy={() =>
                                          copyToClipboard(
                                            nfcTagData.istanbulkartBalance!,
                                          )
                                        }
                                      />
                                    </View>
                                  )}

                                {/* Diğer Mifare Kartları için genel bilgi */}
                                {nfcTagData.cardCategory ===
                                  CardCategory.OTHER_MIFARE && (
                                  <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>
                                      🗂️ Diğer MIFARE Kart
                                    </Text>
                                    {/* Ham veri textInfo içinde gösteriliyor olabilir */}
                                  </View>
                                )}

                                {/* Temel Bilgiler */}
                                <View style={styles.section}>
                                  <Text style={styles.sectionTitle}>
                                    📋 Temel Bilgiler
                                  </Text>
                                  <DataRow
                                    label="🆔 Etiket ID"
                                    value={nfcTagData.id ?? ''}
                                    onCopy={() =>
                                      copyToClipboard(nfcTagData.id)
                                    }
                                  />
                                  <DataRow
                                    label="🔧 Teknoloji"
                                    value={nfcTagData.technology ?? ''}
                                    onCopy={() =>
                                      copyToClipboard(
                                        nfcTagData.technology ?? '',
                                      )
                                    }
                                  />
                                  <DataRow
                                    label="🏭 Üretici"
                                    value={nfcTagData.manufacturer ?? ''}
                                    onCopy={() =>
                                      copyToClipboard(
                                        nfcTagData.manufacturer ?? '',
                                      )
                                    }
                                  />
                                  <DataRow
                                    label="📏 Tip"
                                    value={nfcTagData.type ?? ''}
                                    onCopy={() =>
                                      copyToClipboard(nfcTagData.type ?? '')
                                    }
                                  />
                                  {nfcTagData.maxSize && (
                                    <DataRow
                                      label="💾 Maks. Boyut"
                                      value={`${nfcTagData.maxSize} byte`}
                                    />
                                  )}
                                  <DataRow
                                    label="✏️ Yazılabilir"
                                    value={
                                      nfcTagData.isWritable === undefined
                                        ? 'Bilinmiyor'
                                        : nfcTagData.isWritable
                                        ? '✅ Evet'
                                        : '❌ Hayır'
                                    }
                                  />
                                </View>

                                {/* Teknik Detaylar */}
                                <View style={styles.section}>
                                  <Text style={styles.sectionTitle}>
                                    ⚙️ Teknik Detaylar
                                  </Text>
                                  <DataRow
                                    label="🔌 Desteklenen Teknolojiler"
                                    value={nfcTagData.techTypes.join(', ')}
                                    onCopy={() =>
                                      copyToClipboard(
                                        nfcTagData.techTypes.join(', '),
                                      )
                                    }
                                    multiline
                                  />
                                  {nfcTagData.atqa && (
                                    <DataRow
                                      label="📡 ATQA"
                                      value={nfcTagData.atqa}
                                      onCopy={() =>
                                        copyToClipboard(nfcTagData.atqa)
                                      }
                                    />
                                  )}
                                  {nfcTagData.sak && (
                                    <DataRow
                                      label="🔑 SAK"
                                      value={nfcTagData.sak}
                                      onCopy={() =>
                                        copyToClipboard(nfcTagData.sak)
                                      }
                                    />
                                  )}
                                </View>

                                {/* URL Bilgileri */}
                                {nfcTagData.urlInfo &&
                                  nfcTagData.urlInfo.length > 0 && (
                                    <View style={styles.section}>
                                      <Text style={styles.sectionTitle}>
                                        🔗 URL Bilgileri
                                      </Text>
                                      {nfcTagData.urlInfo.map((url, index) => (
                                        <DataRow
                                          key={index}
                                          label={`🌐 URL ${index + 1}`}
                                          value={url}
                                          onCopy={() => copyToClipboard(url)}
                                          multiline
                                        />
                                      ))}
                                    </View>
                                  )}

                                {/* Metin Bilgileri (İstanbulkart ham verisi ve bakiyesi de burada görünebilir) */}
                                {nfcTagData.textInfo &&
                                  nfcTagData.textInfo.length > 0 && (
                                    <View style={styles.section}>
                                      <Text style={styles.sectionTitle}>
                                        📝 Metin Bilgileri
                                      </Text>
                                      {nfcTagData.textInfo.map(
                                        (text, index) => (
                                          <DataRow
                                            key={index}
                                            label={`📄 Metin ${index + 1}`}
                                            value={text}
                                            onCopy={() => copyToClipboard(text)}
                                            multiline
                                          />
                                        ),
                                      )}
                                    </View>
                                  )}

                                {/* NDEF Mesajları */}
                                {nfcTagData.ndefMessage &&
                                  nfcTagData.ndefMessage.length > 0 && (
                                    <View style={styles.section}>
                                      <Text style={styles.sectionTitle}>
                                        📨 NDEF Mesajları
                                      </Text>
                                      {nfcTagData.ndefMessage.map(
                                        (record: any) => (
                                          <View
                                            key={record.id}
                                            style={styles.ndefRecord}>
                                            <Text style={styles.ndefTitle}>
                                              📋 Kayıt #{record.id + 1}
                                            </Text>
                                            <DataRow
                                              label="🏷️ Tip"
                                              value={record.type}
                                            />
                                            <DataRow
                                              label="🔢 TNF"
                                              value={record.tnf.toString()}
                                            />
                                            <DataRow
                                              label="📏 Boyut"
                                              value={`${record.payloadLength} byte`}
                                            />
                                            {record.payload && (
                                              <DataRow
                                                label="📄 İçerik"
                                                value={record.payload}
                                                onCopy={() =>
                                                  copyToClipboard(
                                                    record.payload,
                                                  )
                                                }
                                                multiline
                                              />
                                            )}
                                            {record.rawPayload && (
                                              <DataRow
                                                label="🔣 Ham Veri"
                                                value={record.rawPayload}
                                                onCopy={() =>
                                                  copyToClipboard(
                                                    record.rawPayload,
                                                  )
                                                }
                                                multiline
                                                isRaw
                                              />
                                            )}
                                          </View>
                                        ),
                                      )}
                                    </View>
                                  )}

                                {nfcTagData.rawData && (
                                  <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>
                                      🏷️ Ham Etiket Verisi (JSON)
                                    </Text>
                                    <Text
                                      style={{
                                        flex: 1,
                                        justifyContent: 'center',
                                        fontSize: 14,
                                        fontWeight: '400',
                                        color: '#000000', // Koyu mavi bölüm başlığı
                                        marginBottom: 12,
                                      }}>
                                      {nfcTagData.rawData}
                                    </Text>
                                  </View>
                                )}

                                <View style={styles.section}>
                                  <TouchableOpacity
                                    style={styles.rawDataButton}
                                    onPress={() =>
                                      copyToClipboard(nfcTagData.rawData || '')
                                    }>
                                    <Text style={styles.rawDataText}>
                                      📋 Tüm Ham Etiket Verisini Kopyala (JSON)
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                        </View>
                      )}
                    {/* Tarama bittiğinde veya hata olduğunda Kapat butonu */}
                    {(!isScanning || nfcTagData) && (
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={closeModal}>
                        <Text style={styles.closeButtonText}>✖️ Kapat</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const DataRow = ({
  label,
  value,
  onCopy,
  multiline = false,
  isRaw = false,
}: {
  label?: string;
  value: string;
  onCopy?: () => void;
  multiline?: boolean;
  isRaw?: boolean;
}) => (
  <View style={[styles.dataRow, multiline && styles.dataRowMultiline]}>
    <Text style={styles.dataLabel}>{label}</Text>
    <View style={styles.dataValueContainer}>
      <Text
        style={[
          styles.dataValue, // Temel değer stili
          multiline && styles.dataValueMultiline, // Varsa multiline için ek stil
          isRaw && styles.dataValueRaw, // Ham veri için özel stil (monospace, vs.)
        ]}
        numberOfLines={multiline ? undefined : 2} // multiline ise tüm satırları göster
        selectable>
        {value}
      </Text>

      {onCopy && (
        <TouchableOpacity style={styles.copyIcon} onPress={onCopy}>
          <Text style={styles.copyText}>📋</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export default Nfc;
