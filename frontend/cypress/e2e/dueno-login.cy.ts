describe('Dueño - Login', () => {
  const duenoEmail = 'dueno@polleria.com';
  const duenoPassword = 'Dueno123!';

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('CT-DUENO-01: permite iniciar sesión correctamente como Dueño', () => {
    cy.visit('/');

    cy.get('input').first().should('not.be.disabled').clear().type(duenoEmail);
    cy.get('input').eq(1).should('not.be.disabled').clear().type(duenoPassword);

    cy.contains('button', 'Entrar')
      .should('not.be.disabled')
      .click();

    cy.location('pathname').should('eq', '/dashboard');

    cy.contains(/Dashboard|Sucursales|Usuarios|Reportes/i).should('be.visible');
  });
});