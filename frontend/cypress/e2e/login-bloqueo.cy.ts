describe('Seguridad - Bloqueo temporal de login', () => {
  const BloqueoEmail = 'nico123@gmail.com';
  const passwordIncorrecto = 'ClaveIncorrecta123!';

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('CT-SEG-01: muestra bloqueo temporal tras intentos fallidos de login', () => {
    cy.visit('/');

    cy.intercept('POST', '**/api/auth/login').as('loginRequest');

    const intentarLoginFallido = () => {
      cy.get('input').first().should('not.be.disabled').clear().type(BloqueoEmail);
      cy.get('input').eq(1).should('not.be.disabled').clear().type(passwordIncorrecto);

      cy.contains('button', 'Entrar')
        .should('not.be.disabled')
        .click();

      cy.wait('@loginRequest');

      cy.wait(500);
    };

    intentarLoginFallido();

    cy.get('body').then(($body) => {
      const yaBloqueado = /60|segundos|espera|intenta/i.test($body.text());

      if (!yaBloqueado) {
        intentarLoginFallido();
      }
    });

    cy.get('body').then(($body) => {
      const yaBloqueado = /60|segundos|espera|intenta/i.test($body.text());

      if (!yaBloqueado) {
        intentarLoginFallido();
      }
    });

    cy.contains(/60|segundos|espera|intenta/i).should('be.visible');
  });
});