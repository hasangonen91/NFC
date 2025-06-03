import React from 'react';
import {
  StyleSheet,
  Platform,
  Dimensions,

} from 'react-native';


const {height} = Dimensions.get('window');

export const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#1a365d', // Üst bar rengiyle uyumlu
    },
    container: {
      flex: 1,
      backgroundColor: '#f0f4f8', // Açık tema arka planı
    },
    header: {
      backgroundColor: '#1a365d', // Koyu mavi başlık
      paddingVertical: 24,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      alignItems: 'center',
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: '#e0e0e0', // Biraz daha açık gri
    },
    warningContainer: {
      backgroundColor: '#fff3cd', // Sarı uyarı arka planı
      padding: 15,
      margin: 20,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ffeeba',
    },
    warningIcon: {
      fontSize: 30,
      marginBottom: 5,
    },
    warningText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#856404', // Koyu sarı metin
      marginBottom: 5,
    },
    warningSubtext: {
      fontSize: 14,
      color: '#856404',
      textAlign: 'center',
      marginBottom: 15,
    },
    settingsButton: {
      backgroundColor: '#007bff', // Mavi buton
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    settingsButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '500',
    },
    scanSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    scanButton: {
      backgroundColor: '#4f46e5', // Indigo
      padding: 25,
      borderRadius: 140, // Tam yuvarlak
      alignItems: 'center',
      justifyContent: 'center',
      width: 240,
      height: 240,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 8,
    },
    scanButtonDisabled: {
      backgroundColor: '#9ca3af', // Gri (devre dışı)
    },
    scanButtonIcon: {
      fontSize: 40,
      marginBottom: 10,
    },
    scanButtonText: {
      fontSize: 20,
      color: '#ffffff',
      fontWeight: 'bold',
      marginBottom: 5,
    },
    scanButtonSubtext: {
      fontSize: 14,
      fontWeight: '500',
      color: '#e0e7ff', // Çok açık indigo
      textAlign: 'center',
      marginTop: 4,
    },
    // Modal Stilleri
    bottomModalBackground: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)', // Yarı saydam arka plan
      justifyContent: 'flex-end',
    },
    bottomModal: {
      backgroundColor: '#ffffff', // Beyaz modal arka planı
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: height * 0.85, // Ekranın %85'i kadar
      paddingHorizontal: 0, // ScrollView kendi padding'ini yönetecek
      paddingTop: 0, // Yukarıdan boşluk yok, drag bar yönetecek
      shadowColor: '#000',
      shadowOffset: {width: 0, height: -3},
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 10,
    },
    modalDragBarContainer: {
      paddingVertical: 8, // Dokunma alanını artır
      alignItems: 'center',
      width: '100%',
    },
    modalDragBar: {
      width: 40,
      height: 5,
      backgroundColor: '#cccccc', // Gri sürükleme çubuğu
      borderRadius: 3,
      marginTop: 8, // Kenardan biraz boşluk
      marginBottom: 4,
    },
    modalContent: {
      paddingHorizontal: 20,
      paddingBottom: 40, // ScrollView için altta boşluk
    },
    scanAnimContainer: {
      width: 180,
      height: 180,
      marginBottom: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanAnim: {
      width: '100%',
      height: '100%',
    },
    scanningText: {
      fontSize: 22,
      fontWeight: '600',
      color: '#1a365d', // Koyu mavi
      marginTop: 10,
      marginBottom: 8,
    },
    scanningStep: {
      fontSize: 15,
      color: '#555555', // Gri
      marginBottom: 20,
      textAlign: 'center',
      minHeight: 20, // Metin değişirken zıplamayı önle
    },
    progressBarContainer: {
      width: '90%',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 25,
      marginTop: 10,
    },
    progressBarBG: {
      flex: 1,
      height: 12,
      backgroundColor: '#e0e0e0', // Açık gri arka plan
      borderRadius: 6,
      marginRight: 10,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#1a365d', // Koyu mavi dolgu
      borderRadius: 6,
    },
    progressText: {
      fontSize: 14,
      color: '#1a365d',
      fontWeight: '500',
    },
    cancelButton: {
      backgroundColor: '#ef4444', // Kırmızı iptal butonu
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 8,
      marginTop: 10,
    },
    cancelButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    modalHeader: {
      alignItems: 'center',
      marginBottom: 10, // Başlık ve animasyon arasına boşluk
      marginTop: 0, // Drag bar'dan sonra boşluk yok
    },
    resultAnim: {
      width: 100,
      height: 100,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 0, // Animasyondan hemen sonra
      marginBottom: 16,
    },
    dataContainer: {
      paddingBottom: 20, // İçerik ve kapat butonu arasına boşluk
    },
    section: {
      marginBottom: 20, // Bölümler arası boşluk
      borderBottomWidth: 1,
      borderBottomColor: '#eeeeee', // İnce ayırıcı çizgi
      paddingBottom: 15,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1a365d', // Koyu mavi bölüm başlığı
      marginBottom: 12,
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start', // multiline için flex-start daha iyi
      paddingVertical: 8, // Satır içi boşluk
    },
    dataRowMultiline: {
      // Multiline için özel bir stil gerekirse
    },
    dataLabel: {
      fontSize: 15,
      color: '#555555', // Gri etiket
      fontWeight: '500',
      flex: 2, // Etiket için daha fazla alan
      marginRight: 8,
    },
    dataValueContainer: {
      flex: 3, // Değer için daha fazla alan
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    dataValue: {
      fontSize: 15,
      color: '#333333', // Koyu gri değer
      flex: 1, // Text'in container içinde yayılmasını sağlar
      textAlign: 'left', // Değerleri sola yasla
    },
    dataValueMultiline: {
      fontSize: 15,
      color: '#333333', // Koyu gri değer
      lineHeight: 20, // Satırlar arasına boşluk
      textAlign: 'left', // Metni sola yasla
      flex: 1, // Text'in container içinde yayılmasını sağlar
    },
    // styles objesi içinde
    dataValueRaw: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 12, // Biraz daha küçük font okunabilirliği artırabilir
      color: '#333', // Biraz daha koyu renk, okunabilirlik için
      lineHeight: 18, // Satırlar arasına biraz boşluk ekler (fontSize'a göre ayarla)
      textAlign: 'left', // Metni sola yasla (zaten varsayılan olabilir)
      // wordBreak: 'break-all', // Bu özelliği kaldırabiliriz, Text bileşeni kaydırmayı yönetir.
    },
    copyIcon: {
      marginLeft: 10,
      padding: 5, // Dokunma alanını artır
    },
    copyText: {
      fontSize: 18,
    },
    ndefRecord: {
      backgroundColor: '#f9f9f9', // NDEF kaydı için hafif arka plan
      borderRadius: 6,
      padding: 10,
      marginBottom: 10,
    },
    ndefTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 8,
    },
    rawDataButton: {
      backgroundColor: '#e5e7eb', // Açık gri buton
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    rawDataText: {
      color: '#1f2937', // Koyu gri metin
      fontSize: 15,
      fontWeight: '500',
    },
    closeButton: {
      backgroundColor: '#6b7280', // Gri kapatma butonu
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10, // Diğer içeriklerden sonra
      marginBottom: Platform.OS === 'ios' ? 10 : 20, // iOS için altta boşluk
    },
    closeButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });