document.addEventListener('DOMContentLoaded', function () {
    // --- CONFIGURAÇÃO ---
    const canvasSim = document.getElementById('simulacaoCanvas');
    const ctxSim = canvasSim.getContext('2d');
    const LARGURA_SIM = canvasSim.width;
    const ALTURA_SIM = canvasSim.height;
    
    // Configuração dos Gráficos
    const canvasGrafEnergia = document.getElementById('graficoEnergia');
    const canvasGrafPosicao = document.getElementById('graficoPosicao');
    const canvasGrafVelocidade = document.getElementById('graficoVelocidade');
    const ctxGrafEnergia = canvasGrafEnergia ? canvasGrafEnergia.getContext('2d') : null;
    const ctxGrafPosicao = canvasGrafPosicao ? canvasGrafPosicao.getContext('2d') : null;
    const ctxGrafVelocidade = canvasGrafVelocidade ? canvasGrafVelocidade.getContext('2d') : null;
    let graficoEnergia, graficoPosicao, graficoVelocidade;
    let dadosGraficoEnergia = { labels: [], datasets: [ { label: 'K', data: [], borderColor: 'rgb(255, 99, 132)', tension: 0.1, pointRadius: 0 }, { label: 'U', data: [], borderColor: 'rgb(54, 162, 235)', tension: 0.1, pointRadius: 0 }, { label: 'E', data: [], borderColor: 'rgb(75, 192, 192)', tension: 0.1, pointRadius: 0 }] };
    let dadosGraficoPosicao = { labels: [], datasets: [ { label: 'Posição (x)', data: [], borderColor: 'rgb(255, 159, 64)', tension: 0.1, pointRadius: 0 }] };
    let dadosGraficoVelocidade = { labels: [], datasets: [ { label: 'Velocidade (v)', data: [], borderColor: 'rgb(153, 102, 255)', tension: 0.1, pointRadius: 0 }] };
    let contadorTempoGrafico = 0;
    const maxPontosGrafico = 200;
    
    // Elementos de UI
    const btnIniciar = document.getElementById('btnIniciar'); const btnResetar = document.getElementById('btnResetar'); const btnPausar = document.getElementById('btnPausar'); const btnContinuar = document.getElementById('btnContinuar');
    const btnEsticada = document.getElementById('btnEsticada'); const btnComprimida = document.getElementById('btnComprimida');
    const sliderPosicao = document.getElementById('sliderPosicao');
    const selectAtrito = document.getElementById('selectAtrito');
    const sliderMassa = document.getElementById('sliderMassa'); const sliderMola = document.getElementById('sliderMola'); const valorMassa = document.getElementById('valorMassa'); const valorMola = document.getElementById('valorMola'); const infoAtrito = document.getElementById('infoAtrito');
    
    const btnVerGraficoEnergia = document.getElementById('btnVerGraficoEnergia');
    const btnVerGraficoPosicao = document.getElementById('btnVerGraficoPosicao');
    const btnVerGraficoVelocidade = document.getElementById('btnVerGraficoVelocidade');
    const janelasGrafico = document.querySelectorAll('.janela-grafico');
    
    // Constantes Físicas
    const pontoEquilibrio = LARGURA_SIM / 2;
    const Y_EIXO_X = ALTURA_SIM / 2; 
    
    const AMPLITUDE_MAXIMA = 350;
    
    // Variáveis de Posição
    let blocoW = 50, blocoH = 50;
    let Y_BLOCO = Y_EIXO_X - (blocoH / 2);
    let Y_MOLA = Y_EIXO_X;
    
    // Variáveis de Estado
    let massa = 10, k = 10, atrito = 0.0;
    let x = 0, velocidade = 0, aceleracao = 0, forca = 0;
    let rodando = false; let animacaoId; let estadoInicialSelecionado = null;
    let isIdeal = true;
    let tempoSimulacao = 0.0;
    let omega = 1.0;
    let amplitude = 0.0;
    const dt = 0.1;
    
    // Novas variáveis globais para exibição no canvas
    let T = 0, f = 0; // Para Período e Frequência
    let K = 0, U = 0, E = 0; // Para Energias
    const fatorPosicao = 100; // Converte pixels para metros
    const fatorEnergia = 10000; // Fator de escala da energia
    
    let corChao = 'rgba(240, 248, 255, 0.5)';
    
    sliderPosicao.min = -AMPLITUDE_MAXIMA;
    sliderPosicao.max = AMPLITUDE_MAXIMA;

    // --- FUNÇÕES DE CÁLCULO, FÍSICA E DESENHO ---
    
    function atualizarTamanhoBloco() {
        let m = parseFloat(sliderMassa.value);
        let newSize = 30 + (m - 1) * (50 / 49);
        blocoW = newSize; blocoH = newSize;
        Y_BLOCO = Y_EIXO_X - (blocoH / 2);
        Y_MOLA = Y_EIXO_X;
    }
    
    function drawArrow(ctx, fromx, fromy, tox, toy, color) {
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(fromx, fromy); ctx.lineTo(tox, toy); ctx.stroke();
        let headlen = 10; let angle = Math.atan2(toy - fromy, tox - fromx);
        ctx.beginPath(); ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath(); ctx.fill();
    }
    
    function desenhar() {
        ctxSim.clearRect(0, 0, LARGURA_SIM, ALTURA_SIM);

        const centroX = pontoEquilibrio;
        const centroY = Y_EIXO_X;
        
        let ampAtual; 
        if (isIdeal || amplitude === 0) { 
            ampAtual = amplitude;
        } else {
            ampAtual = Math.sqrt(x * x + (velocidade * velocidade) / (omega * omega));
            if (ampAtual < 0.1) ampAtual = 0;
        }
        
        let xProjecao = centroX + x;
        
        // ROTAÇÃO ANTI-HORÁRIA
        // O fasor (vetor) no MHS é (x, -v/ω)
        let anguloFasorialRad = Math.atan2(-velocidade / omega, x);
        let particulaX = centroX + ampAtual * Math.cos(anguloFasorialRad);
        // O Y do canvas é invertido. Para girar ACW, o Y do canvas deve ser NEGATIVO.
        let particulaY = centroY - ampAtual * Math.sin(anguloFasorialRad);


        // 1. Eixos
        ctxSim.strokeStyle = '#ccc'; ctxSim.lineWidth = 1;
        ctxSim.beginPath(); ctxSim.moveTo(0, centroY); ctxSim.lineTo(LARGURA_SIM, centroY); ctxSim.stroke();
        ctxSim.beginPath(); ctxSim.moveTo(centroX, 0); ctxSim.lineTo(centroX, ALTURA_SIM); ctxSim.stroke();

        // PISTA DE DESLIZAMENTO
        const alturaPista = 20;
        ctxSim.fillStyle = corChao;
        ctxSim.fillRect(0, centroY - (alturaPista / 2), LARGURA_SIM, alturaPista);
        
        // 2. Círculo
        if (amplitude > 0) {
            ctxSim.strokeStyle = '#aaa'; ctxSim.lineWidth = 2;
            ctxSim.beginPath(); ctxSim.arc(centroX, centroY, amplitude, 0, 2 * Math.PI); ctxSim.stroke();
        }
        
        // 3. Posição do bloco
        Y_BLOCO = Y_EIXO_X - blocoH;
        let posXBloco = pontoEquilibrio + x - (blocoW / 2);

        // 4. Mola 2D
        Y_MOLA = Y_BLOCO + (blocoH / 2); 
        ctxSim.strokeStyle = '#555'; ctxSim.lineWidth = 3; ctxSim.beginPath();
        const startX = centroX;  
        const endX = posXBloco;
        const molaY = Y_MOLA; const molaRaio = 15; const numVoltas = 10;
        let molaComprimento = endX - startX;
        
        if (Math.abs(molaComprimento) < 20) {
             molaComprimento = molaComprimento >= 0 ? 20 : -20;
             if (Math.abs(endX - startX) < 20) {
                 molaComprimento = endX - startX;
             }
        }
       
        let larguraVolta = molaComprimento / numVoltas;
        let currentX = startX;
        ctxSim.moveTo(startX, molaY);

        if (Math.abs(larguraVolta) > 0.1) { 
            for (let i = 0; i < numVoltas; i++) {
                let x_meio = currentX + larguraVolta / 2; let x_fim = currentX + larguraVolta;
                ctxSim.quadraticCurveTo(currentX + larguraVolta * 0.25, molaY - molaRaio, x_meio, molaY);
                ctxSim.quadraticCurveTo(currentX + larguraVolta * 0.75, molaY + molaRaio, x_fim, molaY);
                currentX = x_fim;
            }
        }
        ctxSim.lineTo(endX, molaY); ctxSim.stroke();

        // 5. Bloco
        const grad = ctxSim.createLinearGradient(posXBloco, Y_BLOCO, posXBloco, Y_BLOCO + blocoH); 
        grad.addColorStop(0, '#007bff'); grad.addColorStop(1, '#0056b3'); ctxSim.fillStyle = grad; 
        ctxSim.fillRect(posXBloco, Y_BLOCO, blocoW, blocoH);
        
        
        // Constantes de Estilo para o Texto
        const FONT_REGULAR = '14px Arial';
        const FONT_BOLD = 'bold 14px Arial';
        const FONT_TITLE = 'bold 14px Arial';
        const COLOR_LABEL = '#000';
        const COLOR_VALUE = 'darkred';

        // 6. Triângulo de Projeção
        if (amplitude > 0) {
            
            ctxSim.strokeStyle = 'rgba(255, 0, 0, 0.5)'; ctxSim.lineWidth = 2; ctxSim.setLineDash([5, 5]);
            ctxSim.beginPath(); 
            ctxSim.moveTo(particulaX, particulaY); 
            ctxSim.lineTo(particulaX, centroY);
            ctxSim.stroke();
            ctxSim.setLineDash([]);

            ctxSim.strokeStyle = 'rgba(0, 0, 0, 0.5)'; ctxSim.lineWidth = 1;
            ctxSim.beginPath(); ctxSim.moveTo(centroX, centroY); ctxSim.lineTo(particulaX, particulaY); ctxSim.stroke();
            
            ctxSim.strokeStyle = 'red'; ctxSim.lineWidth = 3;
            ctxSim.beginPath(); ctxSim.moveTo(centroX, centroY); ctxSim.lineTo(xProjecao, centroY); ctxSim.stroke();

            ctxSim.fillStyle = '#0056b3';
            ctxSim.beginPath(); ctxSim.arc(particulaX, particulaY, 8, 0, 2 * Math.PI); ctxSim.fill();
            
            // Desenha o ângulo Phi - PAUSADO
            if (!rodando && estadoInicialSelecionado !== null) { 
                
                let xRelativo = particulaX - centroX;
                let yRelativo = particulaY - centroY;
                
                let anguloPausadoRadAtual = Math.atan2(yRelativo, xRelativo);
                let anguloPausadoGraus = anguloPausadoRadAtual * (180 / Math.PI);

                let anguloPhiMostrado = 0;
                
                // yRelativo < 0 é a METADE DE CIMA
                if (yRelativo < 0) {
                    anguloPhiMostrado = Math.abs(anguloPausadoGraus);
                } else { // Metade de BAIXO
                    anguloPhiMostrado = -Math.abs(anguloPausadoGraus); 
                }

                ctxSim.fillStyle = 'rgba(255, 159, 64, 0.3)';
                ctxSim.beginPath();
                ctxSim.moveTo(centroX, centroY);

                // 1. O arco *sempre* começa em 0
                let anguloInicioArco = 0;
                
                // 2. A direção (antiHorario) depende da metade
                // yRelativo < 0 (Metade CIMA, Q1/Q2) -> antiHorario = true
                // yRelativo > 0 (Metade BAIXO, Q3/Q4) -> antiHorario = false
                let antiHorario = (yRelativo < 0);
                
                ctxSim.arc(centroX, centroY, 60, anguloInicioArco, anguloPausadoRadAtual, antiHorario);
                
                ctxSim.closePath();
                ctxSim.fill();
                
                ctxSim.fillStyle = COLOR_VALUE; // 'darkred'
                ctxSim.font = FONT_BOLD; // 'bold 14px Arial'
                ctxSim.textAlign = 'center';
                
                // Posição do texto na metade do arco
                let anguloTextoRad = anguloPausadoRadAtual / 2;
                if(xRelativo < 0) { // Se estiver na esquerda (Q2/Q3)
                     anguloTextoRad = (anguloPausadoRadAtual + Math.PI) / 2;
                }
                
                let textoX = centroX + 75 * Math.cos(anguloTextoRad);
                let textoY = centroY + 75 * Math.sin(anguloTextoRad);
                
                // Correção para o texto do ângulo não fugir
                if(yRelativo < 0 && xRelativo < 0) { // Q2
                   textoX = centroX + 75 * Math.cos(anguloPausadoRadAtual / 2 + Math.PI/2);
                   textoY = centroY + 75 * Math.sin(anguloPausadoRadAtual / 2 + Math.PI/2);
                } else if (yRelativo > 0 && xRelativo < 0) { // Q3
                   textoX = centroX + 75 * Math.cos(anguloPausadoRadAtual / 2 - Math.PI/2);
                   textoY = centroY + 75 * Math.sin(anguloPausadoRadAtual / 2 - Math.PI/2);
                }

                ctxSim.fillText(`φ = ${anguloPhiMostrado.toFixed(0)}°`, textoX, textoY);
            }
        }
        
        // 7. Setas de Força e Velocidade
        if (rodando || estadoInicialSelecionado !== null) {
            let centroBlocoX = pontoEquilibrio + x;
            let topoBlocoY = Y_BLOCO - 20; 
            const setaTamanho = 50; 

            if (velocidade > 0.1) { 
                    drawArrow(ctxSim, centroBlocoX, topoBlocoY, centroBlocoX + setaTamanho, topoBlocoY, 'green');
                    ctxSim.fillStyle = 'green'; ctxSim.fillText('v', centroBlocoX + setaTamanho + 15, topoBlocoY + 5);
            } else if (velocidade < -0.1) {
                    drawArrow(ctxSim, centroBlocoX, topoBlocoY, centroBlocoX - setaTamanho, topoBlocoY, 'green');
                    ctxSim.fillStyle = 'green'; ctxSim.fillText('v', centroBlocoX - setaTamanho - 15, topoBlocoY + 5);
            }
            
            if (forca > 0.1) {
                drawArrow(ctxSim, centroBlocoX, topoBlocoY - 15, centroBlocoX + setaTamanho, topoBlocoY - 15, 'purple');
                ctxSim.fillStyle = 'purple'; ctxSim.fillText('F', centroBlocoX + setaTamanho + 15, topoBlocoY - 10);
            } else if (forca < -0.1) {
                drawArrow(ctxSim, centroBlocoX, topoBlocoY - 15, centroBlocoX - setaTamanho, topoBlocoY - 15, 'purple');
                ctxSim.fillStyle = 'purple'; ctxSim.fillText('F', centroBlocoX - setaTamanho - 15, topoBlocoY - 10);
            }
        }
        
        // 8. NOVAS INFORMAÇÕES NO CANVAS (Canto superior esquerdo)
        const yStep = 20; // Espaçamento vertical
        let currentY;
        
        let tabStopLeft = 60; // Posição X para os valores começarem

        ctxSim.textAlign = 'left';
        currentY = 30;

        // Título
        ctxSim.fillStyle = COLOR_LABEL;
        ctxSim.font = FONT_TITLE;
        ctxSim.fillText(`Parâmetros do Sistema`, 20, currentY);
        currentY += yStep;

        // Amplitude (A)
        ctxSim.fillStyle = COLOR_LABEL; ctxSim.font = FONT_REGULAR;
        ctxSim.fillText(`A =`, 20, currentY);
        ctxSim.fillStyle = COLOR_VALUE; ctxSim.font = FONT_BOLD;
        ctxSim.fillText(`${(amplitude / fatorPosicao).toFixed(2)} m`, tabStopLeft, currentY);
        currentY += yStep;

        // Posição (x)
        ctxSim.fillStyle = COLOR_LABEL; ctxSim.font = FONT_REGULAR;
        ctxSim.fillText(`x =`, 20, currentY);
        ctxSim.fillStyle = COLOR_VALUE; ctxSim.font = FONT_BOLD;
        ctxSim.fillText(`${(x / fatorPosicao).toFixed(2)} m`, tabStopLeft, currentY);
        currentY += yStep;

        // Omega
        ctxSim.fillStyle = COLOR_LABEL; ctxSim.font = FONT_REGULAR;
        ctxSim.fillText(`ω =`, 20, currentY);
        ctxSim.fillStyle = COLOR_VALUE; ctxSim.font = FONT_BOLD;
        ctxSim.fillText(`${omega.toFixed(2)} rad/s`, tabStopLeft, currentY);
        currentY += yStep;

        // Período (T)
        ctxSim.fillStyle = COLOR_LABEL; ctxSim.font = FONT_REGULAR;
        ctxSim.fillText(`T =`, 20, currentY); 
        ctxSim.fillStyle = COLOR_VALUE; ctxSim.font = FONT_BOLD;
        ctxSim.fillText(`${T.toFixed(2)} s`, tabStopLeft, currentY);
        currentY += yStep;

        // Frequência (f)
        ctxSim.fillStyle = COLOR_LABEL; ctxSim.font = FONT_REGULAR;
        ctxSim.fillText(`f =`, 20, currentY); 
        ctxSim.fillStyle = COLOR_VALUE; ctxSim.font = FONT_BOLD;
        ctxSim.fillText(`${f.toFixed(2)} Hz`, tabStopLeft, currentY);


        // 9. NOVAS INFORMAÇÕES NO CANVAS (Canto superior direito)
        const tabLabelRight = LARGURA_SIM - 100; // Posição X onde os RÓTULOS terminam (ex: 700)
        const tabValueRight = LARGURA_SIM - 20;  // Posição X onde os VALORES terminam (ex: 780)
        
        currentY = 30;

        // Título
        ctxSim.fillStyle = COLOR_LABEL;
        ctxSim.font = FONT_TITLE;
        ctxSim.textAlign = 'left'; // Alinha o Título pela esquerda
        ctxSim.fillText(`Dinâmica`, tabLabelRight, currentY); // Começa na posição do rótulo
        currentY += yStep;

        // Força (F)
        ctxSim.fillStyle = COLOR_LABEL; ctxSim.font = FONT_REGULAR;
        ctxSim.textAlign = 'right'; // Alinha o Rótulo pela DIREITA
        ctxSim.fillText(`Força (F):`, tabLabelRight, currentY); // Termina em x=700
        
        ctxSim.fillStyle = COLOR_VALUE; ctxSim.font = FONT_BOLD;
        ctxSim.textAlign = 'right'; // Alinha o Valor pela DIREITA
        ctxSim.fillText(`${(forca / fatorPosicao).toFixed(2)} N`, tabValueRight, currentY); // Termina em x=780
        currentY += yStep;

        // Velocidade (v)
        ctxSim.fillStyle = COLOR_LABEL; ctxSim.font = FONT_REGULAR;
        ctxSim.textAlign = 'right'; // Alinha o Rótulo pela DIREITA
        ctxSim.fillText(`Velocidade (v):`, tabLabelRight, currentY); // Termina em x=700
        
        ctxSim.fillStyle = COLOR_VALUE; ctxSim.font = FONT_BOLD;
        ctxSim.textAlign = 'right'; // Alinha o Valor pela DIREITA
        ctxSim.fillText(`${(velocidade / fatorPosicao).toFixed(2)} m/s`, tabValueRight, currentY); // Termina em x=780


        // 10. NOVAS INFORMAÇÕES NO CANVAS (Canto inferior esquerdo) 
        const tabStopBottom = 160; // Posição X para valores de energia
        const cantoInferiorY = ALTURA_SIM - 20;
        
        ctxSim.textAlign = 'left';
        currentY = cantoInferiorY - 60; // Posição Y inicial

        // Título
        ctxSim.fillStyle = COLOR_LABEL;
        ctxSim.font = FONT_TITLE;
        ctxSim.fillText(`Energias`, 20, currentY);
        currentY += yStep;

        // Energia Cinética (K)
        ctxSim.fillStyle = COLOR_LABEL; ctxSim.font = FONT_REGULAR;
        ctxSim.fillText(`Energia Cinética (K):`, 20, currentY);
        ctxSim.fillStyle = COLOR_VALUE; ctxSim.font = FONT_BOLD;
        ctxSim.fillText(`${(K / fatorEnergia).toFixed(2)} J`, tabStopBottom, currentY);
        currentY += yStep;

        // Energia Potencial (U)
        ctxSim.fillStyle = COLOR_LABEL; ctxSim.font = FONT_REGULAR;
        ctxSim.fillText(`Energia Potencial (U):`, 20, currentY);
        ctxSim.fillStyle = COLOR_VALUE; ctxSim.font = FONT_BOLD;
        ctxSim.fillText(`${(U / fatorEnergia).toFixed(2)} J`, tabStopBottom, currentY);
        currentY += yStep;

        // Energia Mecânica (E)
        ctxSim.fillStyle = COLOR_LABEL; ctxSim.font = FONT_REGULAR;
        ctxSim.fillText(`Energia Mecânica (E):`, 20, currentY);
        ctxSim.fillStyle = COLOR_VALUE; ctxSim.font = FONT_BOLD;
        ctxSim.fillText(`${(E / fatorEnergia).toFixed(2)} J`, tabStopBottom, currentY);
    }
    
    function atualizar() {
        if (!rodando) return;
        if (isIdeal) {
            tempoSimulacao += dt;
            let angulo = omega * tempoSimulacao;
            x = amplitude * Math.cos(angulo);
            
            // Rotação Anti-Horária
            // v = -Aω*sin(ωt)
            velocidade = -amplitude * omega * Math.sin(angulo);
            forca = -k * x;
        } else {
            forca = -k * x - atrito * velocidade; 
            aceleracao = forca / massa;
            velocidade += aceleracao * dt; 
            x += velocidade * dt; 
            tempoSimulacao += dt;
            
            if (Math.abs(velocidade) < 0.05 && Math.abs(x) < 0.5 && Math.abs(forca) < 0.5) { 
                rodando = false; 
                velocidade = 0; 
                forca = -k * x; 
                desenhar(); 
            }
        }
    }
    
    function atualizarValoresDinamicos() {
        // Atualiza as variáveis globais de energia
        K = 0.5 * massa * (velocidade * velocidade); 
        U = 0.5 * k * (x * x); 
        E = K + U; 
        
        if (rodando) {
            if (contadorTempoGrafico % 5 === 0) {
                const labelTempo = (contadorTempoGrafico * dt).toFixed(1);
                const addData = (chartData, chartInstance, label, newData) => {
                    if (!chartInstance || !chartData) return;
                    
                    if (chartData.labels.length > maxPontosGrafico) { 
                        chartData.labels.shift(); 
                        chartData.datasets.forEach(dataset => dataset.data.shift()); 
                    }

                    chartData.labels.push(label);
                    newData.forEach((val, index) => { if(!chartData.datasets[index].data) chartData.datasets[index].data = []; chartData.datasets[index].data.push(val); });
                    try { chartInstance.update('none'); } catch (e) {}
                };
                // Usa as variáveis globais K, U, E
                addData(dadosGraficoEnergia, graficoEnergia, labelTempo, [K / fatorEnergia, U / fatorEnergia, E / fatorEnergia]);
                addData(dadosGraficoPosicao, graficoPosicao, labelTempo, [x / fatorPosicao]);
                addData(dadosGraficoVelocidade, graficoVelocidade, labelTempo, [velocidade / fatorPosicao]);
            }
            contadorTempoGrafico++;
        }
    }
    function loopAnimacao() { 
        if (!rodando) return; 
        atualizar(); 
        atualizarValoresDinamicos(); 
        desenhar(); 
        animacaoId = requestAnimationFrame(loopAnimacao); 
    }

    // --- FUNÇÕES DE CONTROLE ---
    function inicializarGraficos() {
        const optionsBase = { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { title: { display: true, text: 'Tempo (s)' } } }, plugins: { legend: { position: 'top' } } };
        dadosGraficoEnergia.labels = []; dadosGraficoEnergia.datasets.forEach(d => d.data = []); dadosGraficoPosicao.labels = []; dadosGraficoPosicao.datasets.forEach(d => d.data = []); dadosGraficoVelocidade.labels = []; dadosGraficoVelocidade.datasets.forEach(d => d.data = []);
        if(ctxGrafEnergia) { if (graficoEnergia) graficoEnergia.destroy(); graficoEnergia = new Chart(ctxGrafEnergia, { type: 'line', data: dadosGraficoEnergia, options: { ...optionsBase, scales: {...optionsBase.scales, y: {beginAtZero: true, title: {display: true, text: 'Energia (J)'}}}, plugins: {...optionsBase.plugins, title: {display: true, text: 'Energia vs. Tempo'}} } }); }
        if(ctxGrafPosicao) { if (graficoPosicao) graficoPosicao.destroy(); graficoPosicao = new Chart(ctxGrafPosicao, { type: 'line', data: dadosGraficoPosicao, options: { ...optionsBase, scales: {...optionsBase.scales, y: {beginAtZero: false, title: {display: true, text: 'Posição (m)'}}}, plugins: {...optionsBase.plugins, title: {display: true, text: 'Posição vs. Tempo'}} } }); }
        if(ctxGrafVelocidade) { if (graficoVelocidade) graficoVelocidade.destroy(); graficoVelocidade = new Chart(ctxGrafVelocidade, { type: 'line', data: dadosGraficoVelocidade, options: { ...optionsBase, scales: {...optionsBase.scales, y: {beginAtZero: false, title: {display: true, text: 'Velocidade (m/s)'}}}, plugins: {...optionsBase.plugins, title: {display: true, text: 'Velocidade vs. Tempo'}} } }); }
        contadorTempoGrafico = 0;
    }
    
    function calcularValoresEstaticos() { 
        const m = parseFloat(sliderMassa.value); 
        const c = parseFloat(sliderMola.value); 
        
        // Atualiza as variáveis globais T, f, e omega
        omega = Math.sqrt(c / m); 
        T = 2 * Math.PI * Math.sqrt(m / c); 
        f = 1 / T; 
    }
    
    function selecionarEstado(estado) {
        if (rodando) return; estadoInicialSelecionado = estado; btnIniciar.disabled = false; 
        btnEsticada.classList.remove('active'); btnComprimida.classList.remove('active');
        
        if (estado === 'esticada') { 
            btnEsticada.classList.add('active'); 
            x = AMPLITUDE_MAXIMA; 
        }
        else if (estado === 'comprimida') { 
            btnComprimida.classList.add('active'); 
            x = 80; // Posição x = 0.80m (80 pixels)
        }
        sliderPosicao.value = x; 
        
        massa = parseFloat(sliderMassa.value); k = parseFloat(sliderMola.value);
        
        calcularValoresEstaticos(); // Atualiza omega, T, f
        
        amplitude = Math.abs(x); 
        
        // Rotação Anti-Horária
        tempoSimulacao = Math.acos(x / amplitude) / omega;
        
        velocidade = 0;
        forca = -k * x;
        
        atualizarTamanhoBloco();
        atualizarValoresDinamicos(); // Atualiza K, U, E
        desenhar(); 
    }
    
    function iniciarSimulacao() {
        if (rodando) return;
        
        if (estadoInicialSelecionado === 'esticada') x = AMPLITUDE_MAXIMA;
        else if (estadoInicialSelecionado === 'comprimida') x = 80; // Posição da imagem
        else { x = parseFloat(sliderPosicao.value); }
        
        if (x === 0) {
            btnIniciar.disabled = true;
            return;
        }

        velocidade = 0;
        massa = parseFloat(sliderMassa.value); k = parseFloat(sliderMola.value);
        
        atualizarTamanhoBloco(); 
        
        calcularValoresEstaticos(); // Atualiza omega, T, f
        
        amplitude = Math.abs(x);
        
        tempoSimulacao = Math.acos(x / amplitude) / omega;
        
        rodando = true; 
        btnIniciar.style.display = 'none'; btnContinuar.style.display = 'none'; btnPausar.style.display = 'inline-block'; btnResetar.disabled = false;
        sliderPosicao.disabled = true; btnEsticada.disabled = true; btnComprimida.disabled = true;
        
        inicializarGraficos(); loopAnimacao();
    }
    
    function pausarSimulacao() { 
        rodando = false; 
        btnPausar.style.display = 'none'; 
        btnContinuar.style.display = 'inline-block'; 
        desenhar(); 
    }
    function continuarSimulacao() { 
        rodando = true; 
        btnPausar.style.display = 'inline-block'; 
        btnContinuar.style.display = 'none'; 
        loopAnimacao(); 
    }
    
    function resetarSimulacao() {
        rodando = false; if (animacaoId) cancelAnimationFrame(animacaoId);
        x = 0; velocidade = 0; forca = 0; estadoInicialSelecionado = null; 
        
        amplitude = 0.0;
        tempoSimulacao = 0.0;
        
        btnIniciar.style.display = 'inline-block'; btnIniciar.disabled = true;
        btnPausar.style.display = 'none'; btnContinuar.style.display = 'none';
        btnResetar.disabled = true;
        sliderPosicao.disabled = false; sliderPosicao.value = 0;
        btnEsticada.disabled = false; btnComprimida.disabled = false;
        btnEsticada.classList.remove('active'); btnComprimida.classList.remove('active');
        
        sliderMassa.value = 10;
        sliderMola.value = 10;
        valorMassa.textContent = '10';
        valorMola.textContent = '10';
        atualizarTamanhoBloco();
        
        isIdeal = true; atrito = 0.0;
        selectAtrito.value = 'ideal';
        infoAtrito.textContent = "Sem Atrito (Ideal)";
        
        corChao = 'rgba(240, 248, 255, 0.5)';

        // Atualiza e limpa todos os valores
        calcularValoresEstaticos();
        atualizarValoresDinamicos();
        desenhar(); 
        inicializarGraficos();
    }
    
    // --- EVENT LISTENERS ---
    btnEsticada.addEventListener('click', () => selecionarEstado('esticada'));
    btnComprimida.addEventListener('click', () => selecionarEstado('comprimida'));
    
    sliderPosicao.addEventListener('input', (e) => {
        if (rodando) return; x = parseFloat(e.target.value); estadoInicialSelecionado = 'manual';
        btnEsticada.classList.remove('active'); btnComprimida.classList.remove('active');

        massa = parseFloat(sliderMassa.value); k = parseFloat(sliderMola.value);
        calcularValoresEstaticos(); // Atualiza omega, T, f

        if (x === 0) {
            btnIniciar.disabled = true;
            amplitude = 0;
            tempoSimulacao = 0; 
            velocidade = 0;
            forca = 0;
        } else {
            btnIniciar.disabled = false;
            amplitude = Math.abs(x); 
            
            // *** CORREÇÃO 1: Rotação Anti-Horária (ACW) ***
            tempoSimulacao = Math.acos(x / amplitude) / omega;
             
            velocidade = 0;
            forca = -k * x;
        }
        
        atualizarValoresDinamicos(); // Atualiza K, U, E
        desenhar(); 
    });
    
    btnIniciar.addEventListener('click', iniciarSimulacao); 
    btnPausar.addEventListener('click', pausarSimulacao); 
    btnContinuar.addEventListener('click', continuarSimulacao); 
    btnResetar.addEventListener('click', resetarSimulacao);
    
    selectAtrito.addEventListener('change', (e) => {
        const valor = e.target.value;
        if (valor === 'ideal') {
            isIdeal = true; atrito = 0.0;
            infoAtrito.textContent = "Sem Atrito (Ideal)";
            corChao = 'rgba(240, 248, 255, 0.5)'; // AliceBlue
        } else if (valor === 'gelo') {
            isIdeal = false; atrito = 0.1;
            infoAtrito.textContent = "Gelo (baixo)";
            corChao = 'rgba(173, 216, 230, 0.5)'; // LightBlue
        } else if (valor === 'madeira') {
            isIdeal = false; atrito = 0.5;
            infoAtrito.textContent = "Madeira (médio)";
            corChao = 'rgba(210, 180, 140, 0.5)'; // Tan
        } else if (valor === 'lixa') {
            isIdeal = false; atrito = 2.0;
            infoAtrito.textContent = "Lixa (alto)";
            corChao = 'rgba(128, 128, 128, 0.5)'; // Gray
        }
        
        if (!rodando) desenhar();
    });
    
    sliderMassa.addEventListener('input', (e) => { 
        valorMassa.textContent = e.target.value; 
        massa = parseFloat(e.target.value); 
        calcularValoresEstaticos();
        atualizarTamanhoBloco();
        if (!rodando) desenhar(); // Redesenha para atualizar 'T' e 'f'
    });
    sliderMola.addEventListener('input', (e) => { 
        valorMola.textContent = e.target.value; 
        k = parseFloat(e.target.value); 
        calcularValoresEstaticos(); 
        if (!rodando) desenhar(); // Redesenha para atualizar 'T' e 'f'
    });
    
    btnVerGraficoEnergia.addEventListener('click', () => document.getElementById('janelaGraficoEnergia').style.display = 'block');
    btnVerGraficoPosicao.addEventListener('click', () => document.getElementById('janelaGraficoPosicao').style.display = 'block');
    btnVerGraficoVelocidade.addEventListener('click', () => document.getElementById('janelaGraficoVelocidade').style.display = 'block');

    // --- LÓGICA PARA ARRASTAR/REDIMENSIONAR JANELAS ---
    
    function makeDraggable(elmnt) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = elmnt.querySelector(".janela-header");
        if (header) { header.onmousedown = dragMouseDown; } else { elmnt.onmousedown = dragMouseDown; }
        function dragMouseDown(e) { e = e || window.event; e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
        function elementDrag(e) { e = e || window.event; e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; }
        function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
    }
    
    function makeResizable(elmnt) {
        const resizer = elmnt.querySelector(".janela-redimensionar");
        if (!resizer) return;
        resizer.onmousedown = dragMouseDown;
        function dragMouseDown(e) { e.preventDefault(); document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
        function elementDrag(e) {
            e.preventDefault();
            let newWidth = e.clientX - elmnt.offsetLeft;
            let newHeight = e.clientY - elmnt.offsetTop;
            elmnt.style.width = Math.max(300, newWidth) + 'px';
            elmnt.style.height = Math.max(250, newHeight) + 'px';
            let chartId = elmnt.querySelector('canvas').id;
            let chartInstance = null;
            if (chartId === 'graficoEnergia') chartInstance = graficoEnergia;
            else if (chartId === 'graficoPosicao') chartInstance = graficoPosicao;
            else if (chartId === 'graficoVelocidade') chartInstance = graficoVelocidade;
            if (chartInstance) {
                chartInstance.resize();
            }
        }
        function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
    }

    janelasGrafico.forEach(janela => {
        makeDraggable(janela);
        makeResizable(janela);
    });

    // --- INÍCIO ---
    atualizarTamanhoBloco();
    resetarSimulacao();
    btnPausar.style.display = 'none';
    btnContinuar.style.display = 'none';

});
