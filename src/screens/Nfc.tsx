import React from 'react';
import {View, Text, TouchableOpacity, StatusBar, SafeAreaView} from 'react-native';
import {styles} from '../styles';
import NfcModal from '../components/NfcModal';
import useNfc from '../hooks/useNfc';

const Nfc = () => {
  const {
    nfcEnabled, isScanning, modalVisible, nfcTagData, isSuccess,
    readAnyCard, openNfcSettings, closeModal, cancelScanning,
    scanningStep, scanProgress, progressAnim, lastErrorMessage,
    copyToClipboard,
  } = useNfc();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔍 NFC Kart Okuyucu</Text>
          <Text style={styles.subtitle}>Kart veya kredi kartı bilgilerini analiz edin</Text>
        </View>

        {nfcEnabled === false && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>NFC Kapalı</Text>
            <Text style={styles.warningSubtext}>NFC özelliğini açmanız gerekiyor</Text>
            <TouchableOpacity style={styles.settingsButton} onPress={openNfcSettings}>
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
            onPress={readAnyCard}
            disabled={nfcEnabled === false || isScanning}>
            <Text style={styles.scanButtonIcon}>💳</Text>
            <Text style={styles.scanButtonText}>Kartı Tara</Text>
            <Text style={styles.scanButtonSubtext}>Herhangi bir NFC kartınızı yaklaştırın</Text>
          </TouchableOpacity>
        </View>

        <NfcModal
          visible={modalVisible}
          isScanning={isScanning}
          isSuccess={isSuccess}
          nfcTagData={nfcTagData}
          onCancel={cancelScanning}
          onClose={closeModal}
          scanningStep={scanningStep}
          scanProgress={scanProgress}
          progressAnim={progressAnim}
          lastErrorMessage={lastErrorMessage}
          copyToClipboard={copyToClipboard}
        />
      </View>
    </SafeAreaView>
  );
};

export default Nfc;