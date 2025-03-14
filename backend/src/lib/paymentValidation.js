/**
 * Valida os detalhes do cartão de pagamento
 * @param {Object} cardDetails - Detalhes do cartão
 * @param {string} cardDetails.number - Número do cartão
 * @param {string} cardDetails.expiry - Data de validade no formato MM/YY
 * @param {string} cardDetails.cvc - Código de segurança
 * @param {string} cardDetails.name - Nome do titular
 * @returns {boolean} - Retorna true se os detalhes são válidos
 */
export const validateCard = (cardDetails) => {
  try {
    console.log("Validando cartão:", cardDetails ? "Dados recebidos" : "Dados não recebidos");
    
    // Verificar se o objeto existe
    if (!cardDetails) {
      console.log("Detalhes do cartão ausentes");
      return false;
    }
    
    const { number, expiry, cvc, name } = cardDetails;
    
    // Verificar se todos os campos existem
    if (!number || !expiry || !cvc || !name) {
      console.log("Campos obrigatórios ausentes", { 
        hasNumber: !!number, 
        hasExpiry: !!expiry, 
        hasCVC: !!cvc, 
        hasName: !!name 
      });
      return false;
    }
    
    // Remover espaços do número do cartão
    const cardNumber = number.toString().replace(/\s/g, '');
    
    // Validação básica do número do cartão
    if (!/^\d{16}$/.test(cardNumber)) {
      console.log("Número do cartão inválido:", cardNumber);
      return false;
    }
    
    // Validação da data de validade (formato MM/YY)
    if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(expiry)) {
      console.log("Data de validade inválida:", expiry);
      return false;
    }
    
    // Extrair mês e ano
    const [month, year] = expiry.split('/').map(n => parseInt(n));
    const currentYear = new Date().getFullYear() % 100; // Últimos 2 dígitos do ano
    const currentMonth = new Date().getMonth() + 1; // Janeiro = 1
    
    // Verificar se o cartão não está expirado
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      console.log("Cartão expirado:", { currentMonth, currentYear, cardMonth: month, cardYear: year });
      return false;
    }
    
    // Validação do CVC
    if (!/^\d{3,4}$/.test(cvc)) {
      console.log("CVC inválido:", cvc);
      return false;
    }
    
    // Validação do nome (pelo menos 3 caracteres)
    if (typeof name !== 'string' || name.trim().length < 3) {
      console.log("Nome inválido:", name);
      return false;
    }
    
    console.log("Cartão válido");
    return true;
  } catch (error) {
    console.error("Erro na validação do cartão:", error);
    return false;
  }
};