describe('Login', () => {
  it('inicio de sesión e ingreso al dashboard', () => {
    cy.visit('http://localhost:5173/');

    cy.get('input').first().type('admin@polleria.com');
    cy.get('input').eq(1).type('Admin123!');

    cy.contains('Entrar').click();

    cy.location('pathname').should('eq', '/dashboard');
  });
});