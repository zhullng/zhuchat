import { CreditCard, Calendar, Lock, User } from 'lucide-react';

const CardDetailsForm = ({ cardDetails, setCardDetails, errors }) => {
  const handleCardNumberChange = (e) => {
    // Formatar número do cartão com espaços a cada 4 dígitos
    let value = e.target.value.replace(/\s/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    
    // Adicionar espaços a cada 4 dígitos
    const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
    
    setCardDetails({ ...cardDetails, number: formatted });
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 4) value = value.slice(0, 4);
    
    // Formatar como MM/YY
    if (value.length > 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    
    setCardDetails({ ...cardDetails, expiry: value });
  };

  const handleCVCChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    
    setCardDetails({ ...cardDetails, cvc: value });
  };

  return (
    <div className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Número do Cartão</span>
        </label>
        <div className="input-group">
          <span>
            <CreditCard className="size-5" />
          </span>
          <input
            type="text"
            className={`input input-bordered w-full ${errors.cardNumber ? 'input-error' : ''}`}
            placeholder="1234 5678 9012 3456"
            value={cardDetails.number}
            onChange={handleCardNumberChange}
          />
        </div>
        {errors.cardNumber && <span className="text-error text-sm mt-1">{errors.cardNumber}</span>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Data de Validade</span>
          </label>
          <div className="input-group">
            <span>
              <Calendar className="size-5" />
            </span>
            <input
              type="text"
              className={`input input-bordered w-full ${errors.expiry ? 'input-error' : ''}`}
              placeholder="MM/YY"
              value={cardDetails.expiry}
              onChange={handleExpiryChange}
            />
          </div>
          {errors.expiry && <span className="text-error text-sm mt-1">{errors.expiry}</span>}
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">CVC/CVV</span>
          </label>
          <div className="input-group">
            <span>
              <Lock className="size-5" />
            </span>
            <input
              type="text"
              className={`input input-bordered w-full ${errors.cvc ? 'input-error' : ''}`}
              placeholder="123"
              value={cardDetails.cvc}
              onChange={handleCVCChange}
            />
          </div>
          {errors.cvc && <span className="text-error text-sm mt-1">{errors.cvc}</span>}
        </div>
      </div>
      
      <div className="form-control">
        <label className="label">
          <span className="label-text">Nome no Cartão</span>
        </label>
        <div className="input-group">
          <span>
            <User className="size-5" />
          </span>
          <input
            type="text"
            className={`input input-bordered w-full ${errors.cardName ? 'input-error' : ''}`}
            placeholder="NOME COMPLETO"
            value={cardDetails.name}
            onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
          />
        </div>
        {errors.cardName && <span className="text-error text-sm mt-1">{errors.cardName}</span>}
      </div>
    </div>
  );
};

export default CardDetailsForm;