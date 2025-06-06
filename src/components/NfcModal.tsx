import React from 'react';
import {Modal, Animated, Dimensions, TouchableOpacity, View, Text, ScrollView} from 'react-native';
import LottieView from 'lottie-react-native';
import {styles} from '../styles';

const {height} = Dimensions.get('window');

const NfcModal = ({
  visible, isScanning, isSuccess, nfcTagData,
  onCancel, onClose, scanningStep, scanProgress, progressAnim,
  lastErrorMessage, copyToClipboard,
}: any) => {
  const [modalAnim] = React.useState(new Animated.Value(1));
  React.useEffect(() => {
    Animated.timing(modalAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 350 : 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => { if (!isScanning) onClose(); }}>
      <Animated.View style={[styles.bottomModalBackground, {opacity: modalAnim}]}>
        <Animated.View style={[
          styles.bottomModal,
          {transform: [{translateY: modalAnim.interpolate({inputRange: [0, 1], outputRange: [height, 0]})}]}
        ]}>
          <TouchableOpacity style={styles.modalDragBarContainer} onPress={onClose} activeOpacity={1}>
            <View style={styles.modalDragBar} />
          </TouchableOpacity>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            {isScanning ? (
              <View style={{alignItems: 'center', paddingTop: 24, paddingBottom: 24}}>
                <View style={styles.scanAnimContainer}>
                  <LottieView source={require('../assets/nfc-scan.json')} autoPlay loop style={styles.scanAnim} />
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
                            inputRange: [0, 1], outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{scanProgress}%</Text>
                </View>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                  <Text style={styles.cancelButtonText}>❌ İptal Et</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {isSuccess !== null && (
                  <View>
                    <View style={styles.modalHeader}>
                      <LottieView
                        source={
                          isSuccess
                            ? require('../assets/success.json')
                            : require('../assets/failure.json')
                        }
                        autoPlay loop={false} style={styles.resultAnim}
                      />
                      <Text
                        style={[
                          styles.modalTitle,
                          {color: isSuccess ? '#22c55e' : '#ef4444'},
                        ]}>
                        {isSuccess
                          ? '✅ Tarama Başarılı!'
                          : `❌ ${lastErrorMessage || 'Tarama Başarısız!'}`}
                      </Text>
                    </View>
                    {isSuccess && nfcTagData && (
                      <View style={styles.dataContainer}>
                        <InfoSection nfcTagData={nfcTagData} copyToClipboard={copyToClipboard} />
                      </View>
                    )}
                  </View>
                )}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>✖️ Kapat</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const InfoSection = ({nfcTagData, copyToClipboard}: any) => (
  <>
    {/* Kredi Kartı */}
    {nfcTagData && nfcTagData.type === 'EMV Credit Card' && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💳 Kredi Kartı Bilgileri</Text>
        <DataRow label="Kart Numarası (PAN)" value={nfcTagData.pan ?? ''} onCopy={() => copyToClipboard(nfcTagData.pan)} />
        <DataRow label="Son Kullanma Tarihi" value={nfcTagData.expDate ?? ''} onCopy={() => copyToClipboard(nfcTagData.expDate)} />
        <DataRow label="Ham Hex Veri" value={nfcTagData.rawData} multiline isRaw onCopy={() => copyToClipboard(nfcTagData.rawData)} />
      </View>
    )}
    {/* Standart NFC etiketi */}
    {nfcTagData && nfcTagData.type !== 'EMV Credit Card' && (
      <>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Temel Bilgiler</Text>
          <DataRow label="🆔 Etiket ID" value={nfcTagData.id ?? ''} onCopy={() => copyToClipboard(nfcTagData.id)} />
          <DataRow label="🔧 Teknoloji" value={nfcTagData.technology ?? ''} onCopy={() => copyToClipboard(nfcTagData.technology ?? '')} />
          <DataRow label="🏭 Üretici" value={nfcTagData.manufacturer ?? ''} onCopy={() => copyToClipboard(nfcTagData.manufacturer ?? '')} />
          <DataRow label="📏 Tip" value={nfcTagData.type ?? ''} onCopy={() => copyToClipboard(nfcTagData.type ?? '')} />
          {nfcTagData.maxSize !== undefined && (<DataRow label="💾 Maks. Boyut" value={`${nfcTagData.maxSize} byte`} />)}
          <DataRow label="✏️ Yazılabilir" value={nfcTagData.isWritable === undefined ? 'Bilinmiyor' : nfcTagData.isWritable ? '✅ Evet' : '❌ Hayır'} />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Teknik Detaylar</Text>
          <DataRow label="🔌 Desteklenen Teknolojiler" value={nfcTagData.techTypes.join(', ')} onCopy={() => copyToClipboard(nfcTagData.techTypes.join(', '))} multiline />
          {nfcTagData.atqa && (<DataRow label="📡 ATQA" value={nfcTagData.atqa} onCopy={() => copyToClipboard(nfcTagData.atqa)} /> )}
          {nfcTagData.sak && (<DataRow label="🔑 SAK" value={nfcTagData.sak} onCopy={() => copyToClipboard(nfcTagData.sak)} /> )}
        </View>
        {nfcTagData.urlInfo && nfcTagData.urlInfo.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔗 URL Bilgileri</Text>
            {nfcTagData.urlInfo.map((url: string, index: number) => (
              <DataRow key={index} label={`🌐 URL ${index + 1}`} value={url} onCopy={() => copyToClipboard(url)} multiline />
            ))}
          </View>
        )}
        {nfcTagData.textInfo && nfcTagData.textInfo.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Metin Bilgileri</Text>
            {nfcTagData.textInfo.map((text: string, index: number) => (
              <DataRow key={index} label={`📄 Metin ${index + 1}`} value={text} onCopy={() => copyToClipboard(text)} multiline />
            ))}
          </View>
        )}
        {nfcTagData.ndefMessage && nfcTagData.ndefMessage.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📨 NDEF Mesajları</Text>
            {nfcTagData.ndefMessage.map((record: any) => (
              <View key={record.id} style={styles.ndefRecord}>
                <Text style={styles.ndefTitle}>📋 Kayıt #{record.id + 1} ({record.type})</Text>
                <DataRow label="🔢 TNF" value={record.tnf.toString()} />
                <DataRow label="📏 Boyut" value={`${record.payloadLength} byte`} />
                {record.payload && ( <DataRow label="📄 İçerik (Metin)" value={record.payload} onCopy={() => copyToClipboard(record.payload)} multiline /> )}
                {record.rawPayload && ( <DataRow label="🔣 Ham Veri (Payload Hex)" value={record.rawPayload} onCopy={() => copyToClipboard(record.rawPayload)} multiline isRaw /> )}
              </View>
            ))}
          </View>
        )}
        {nfcTagData.rawData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷️ Ham Etiket Verisi (JSON)</Text>
            <DataRow label="JSON" value={nfcTagData.rawData} onCopy={() => copyToClipboard(nfcTagData.rawData)} multiline isRaw />
          </View>
        )}
      </>
    )}
  </>
);

const DataRow = ({
  label, value, onCopy, multiline = false, isRaw = false,
}: {
  label?: string; value: string; onCopy?: () => void;
  multiline?: boolean; isRaw?: boolean;
}) => (
  <View style={[styles.dataRow, multiline && styles.dataRowMultiline]}>
    {label && <Text style={styles.dataLabel}>{label}</Text> }
    <View style={styles.dataValueContainer}>
      <Text
        style={[
          styles.dataValue, multiline && styles.dataValueMultiline,
          isRaw && styles.dataValueRaw,
        ]}
        numberOfLines={multiline || isRaw ? undefined : 2 }
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

export default NfcModal;