var database = require("../database/config");
var jsonStore = require("../database/jsonStore");



function salvar(certas, erradas, fkUsuario,fkQuiz) {
    if (jsonStore.ativo()) {
        return jsonStore.salvar(certas, erradas, fkUsuario, fkQuiz);
    }

    var instrucao = `
        INSERT INTO resposta (totalCerto, totalErrado, fkUsuario,fkQuiz)
        VALUES (${certas}, ${erradas}, ${fkUsuario},${fkQuiz});
    `;

    console.log("Executando SQL:\n" + instrucao);
    return database.executar(instrucao);
}

// pegando os dados do banco
function buscarResultados(idUsuario){
if (jsonStore.ativo()) {
    return jsonStore.buscarResultados(idUsuario);
}

var instrucao=`  SELECT 
            quiz.nome AS nomeQuiz,
            SUM(resposta.totalCerto) AS totalCerto,
            SUM(resposta.totalErrado) AS totalErrado
        FROM resposta
        JOIN quiz ON resposta.fkQuiz = quiz.idQuiz
        WHERE resposta.fkUsuario = ${idUsuario}
        GROUP BY quiz.nome;
    `;

console.log("Executando SQL:\n" + instrucao);
    return database.executar(instrucao);
}

module.exports = {
    salvar,
    buscarResultados
};