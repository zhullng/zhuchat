import QRCode from 'qrcode';

export const generateQRCode = async (data) => {
  try {
    // Gerar código QR como URL de dados
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      margin: 1,
      color: {
        dark: '#000000', // Cor dos pontos
        light: '#FFFFFF' // Cor do fundo
      }
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.log("Error generating QR code:", error.message);
    throw new Error('Falha ao gerar código QR');
  }
};