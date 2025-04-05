import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';

/**
 * Serviço para gerenciar uploads e downloads de arquivos usando GridFS
 */
class GridFSService {
  constructor() {
    this.bucket = null;
    this.initBucket();
  }

  /**
   * Inicializa o bucket GridFS
   */
  initBucket() {
    if (mongoose.connection.readyState === 1) {
      // Se já estiver conectado
      this.bucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads'
      });
      console.log('GridFS bucket inicializado com sucesso');
    } else {
      // Se não estiver conectado, configure para inicializar quando conectar
      mongoose.connection.once('open', () => {
        this.bucket = new GridFSBucket(mongoose.connection.db, {
          bucketName: 'uploads'
        });
        console.log('GridFS bucket inicializado com sucesso após conexão');
      });
    }
  }

  /**
   * Verifica se o bucket está inicializado e pronto para uso
   */
  ensureBucket() {
    if (!this.bucket) {
      if (mongoose.connection.readyState === 1) {
        this.initBucket();
      } else {
        throw new Error('Conexão MongoDB não está pronta. Não é possível acessar GridFS.');
      }
    }
  }

  /**
   * Faz upload de um arquivo para o GridFS
   * 
   * @param {Buffer|String} fileData - Dados do arquivo como Buffer ou string base64
   * @param {String} filename - Nome do arquivo
   * @param {Object} metadata - Metadados adicionais
   * @returns {Promise<Object>} - Informações do arquivo salvo
   */
  async uploadFile(fileData, filename, metadata = {}) {
    try {
      this.ensureBucket();
      
      // Converter base64 para buffer se necessário
      let buffer;
      if (typeof fileData === 'string' && fileData.includes('base64')) {
        // Remover prefixo "data:mime/type;base64," se existir
        const base64Data = fileData.split(';base64,').pop();
        buffer = Buffer.from(base64Data, 'base64');
      } else if (typeof fileData === 'string') {
        buffer = Buffer.from(fileData);
      } else {
        buffer = fileData;
      }
      
      // Criar stream a partir do buffer
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null); // Sinaliza o fim do stream
      
      // Configurar upload stream
      const uploadStream = this.bucket.openUploadStream(filename, {
        metadata
      });
      
      // Obter o ID do arquivo (importante capturar antes de completar o upload)
      const fileId = uploadStream.id;
      
      // Promisificar o upload stream
      const uploadPromise = new Promise((resolve, reject) => {
        uploadStream.on('finish', () => {
          resolve({
            fileId,
            filename,
            metadata
          });
        });
        
        uploadStream.on('error', (error) => {
          reject(error);
        });
      });
      
      // Fazer o pipe do stream de leitura para o stream de upload
      readableStream.pipe(uploadStream);
      
      // Aguardar conclusão do upload
      return await uploadPromise;
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo para GridFS:', error);
      throw error;
    }
  }

  /**
   * Faz download de um arquivo do GridFS
   * 
   * @param {String} fileId - ID do arquivo a ser baixado
   * @returns {Promise<Object>} - Objeto contendo buffer e metadados do arquivo
   */
  async downloadFile(fileId) {
    try {
      this.ensureBucket();
      
      // Converter string para ObjectId se necessário
      const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
      
      // Verificar se o arquivo existe
      const files = await this.bucket.find({ _id: objectId }).toArray();
      
      if (!files || files.length === 0) {
        throw new Error(`Arquivo com ID ${fileId} não encontrado`);
      }
      
      const fileInfo = files[0];
      
      // Criar download stream
      const downloadStream = this.bucket.openDownloadStream(objectId);
      
      // Coletar chunks do stream em um buffer
      const chunks = [];
      
      // Promisificar o download stream
      const downloadPromise = new Promise((resolve, reject) => {
        downloadStream.on('data', chunk => {
          chunks.push(chunk);
        });
        
        downloadStream.on('end', () => {
          // Concatenar todos os chunks em um único buffer
          const buffer = Buffer.concat(chunks);
          
          resolve({
            buffer,
            metadata: fileInfo.metadata,
            filename: fileInfo.filename,
            contentType: fileInfo.contentType
          });
        });
        
        downloadStream.on('error', error => {
          reject(error);
        });
      });
      
      return await downloadPromise;
    } catch (error) {
      console.error('Erro ao fazer download do arquivo do GridFS:', error);
      throw error;
    }
  }

  /**
   * Deleta um arquivo do GridFS
   * 
   * @param {String} fileId - ID do arquivo a ser deletado
   * @returns {Promise<Boolean>} - True se a operação foi bem sucedida
   */
  async deleteFile(fileId) {
    try {
      this.ensureBucket();
      
      // Converter string para ObjectId se necessário
      const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
      
      // Deletar o arquivo
      await this.bucket.delete(objectId);
      
      return true;
    } catch (error) {
      console.error('Erro ao deletar arquivo do GridFS:', error);
      throw error;
    }
  }
}

// Exportar uma instância única do serviço
export const gridFSService = new GridFSService();

export default gridFSService;