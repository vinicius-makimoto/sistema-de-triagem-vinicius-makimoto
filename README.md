# Sistema de Triagem PS

Aplicação demonstrativa para cadastro de pacientes, registro de sinais vitais e organização de uma fila de atendimento de pronto-socorro. O projeto é executado no navegador e não possui backend.

> **Aviso:** este projeto é acadêmico/demonstrativo. Não use dados reais de pacientes. A classificação sugerida não substitui avaliação profissional nem protocolos clínicos oficiais.

## Como executar

1. Abra `index.html` em um navegador moderno.
2. Entre com as credenciais demonstrativas:
   - **Usuário:** `recepcao`
   - **Senha:** `triagem123`
3. Para consultar o CEP pelo ViaCEP, carregar jQuery e SweetAlert2, é necessária conexão com a internet.

Se o navegador restringir recursos ao abrir o arquivo diretamente, sirva a pasta do projeto com um servidor web estático local e abra o endereço informado por ele. Não é necessário instalar dependências de servidor ou executar um processo de build.

## Funcionalidades

- Login demonstrativo e navegação entre Cadastro, Triagem, Fila e Atendidos.
- Cadastro e busca de pacientes, com validações de idade, convênio e validade.
- Plano SUS desabilita os campos de convênio e validade.
- Máscara de CEP e preenchimento de endereço pelo serviço ViaCEP.
- Máscaras e validações para pressão arterial, temperatura, oxigenação e frequência cardíaca.
- Sugestão de classificação baseada em regras locais de sinais vitais e sintomas. A decisão final deve ser feita por profissional habilitado.
- Fila ordenada por classificação clínica (vermelho, amarelo, verde e branco); dentro da mesma classificação, prioriza menores de 3 anos e maiores de 60 anos. Empates mantêm a ordem de chegada.
- Histórico de pacientes chamados para atendimento e contadores.
- Confirmações e mensagens de sucesso/validação com SweetAlert2.

## Dados e limitações

- Os pacientes, triagens e atendimentos ficam no `localStorage` do navegador. Os dados permanecem nesse navegador até serem apagados.
- O login é apenas uma barreira visual: as credenciais estão no código e não há autenticação segura, controle de acesso real ou armazenamento protegido.
- ViaCEP, jQuery e SweetAlert2 são carregados de serviços externos; funções que dependem deles requerem internet.
- O histórico registra pacientes chamados da fila, não a confirmação de que o atendimento clínico foi concluído.

## Tecnologias

- HTML, CSS e JavaScript.
- jQuery 3.7.1 para máscaras e consulta do CEP.
- SweetAlert2 11 para alertas e confirmações.
- [ViaCEP](https://viacep.com.br/) para consulta de endereços por CEP.

## Estrutura do projeto

```text
.
├── index.html
├── assets/
│   ├── app.js
│   ├── cadastro.js
│   ├── fila.js
│   ├── state.js
│   ├── styles.css
│   └── triagem.js
├── RELATORIO_BUGS_E_MELHORIAS.html
└── SETUP_E_EXECUCAO.docx
```

## Relatórios e documentação

- [Relatório de bugs e melhorias](./RELATORIO_BUGS_E_MELHORIAS.html)
- [Setup e execução](./SETUP_E_EXECUCAO.docx)
