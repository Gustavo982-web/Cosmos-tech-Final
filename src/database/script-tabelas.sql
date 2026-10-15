CREATE DATABASE IF NOT EXISTS cosmos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cosmos;

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(30) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    bio VARCHAR(280) NULL,
    cargo VARCHAR(120) NULL,
    avatar_url VARCHAR(255) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario),
    UNIQUE KEY unique_email (email),
    UNIQUE KEY unique_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz (
    idQuiz INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(200) NOT NULL,
    PRIMARY KEY (idQuiz)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resposta (
    idResposta INT NOT NULL AUTO_INCREMENT,
    totalCerto INT NOT NULL DEFAULT 0,
    totalErrado INT NOT NULL DEFAULT 0,
    dataRegistro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fkUsuario INT NOT NULL,
    fkQuiz INT NOT NULL,
    PRIMARY KEY (idResposta),
    KEY idx_fkUsuario (fkUsuario),
    KEY idx_fkQuiz (fkQuiz),
    CONSTRAINT fk_resposta_usuario FOREIGN KEY (fkUsuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_resposta_quiz FOREIGN KEY (fkQuiz) REFERENCES quiz (idQuiz) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO quiz (idQuiz, nome) VALUES (1, 'Sistema Solar')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);
INSERT INTO quiz (idQuiz, nome) VALUES (2, 'Viagens Espaciais')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);