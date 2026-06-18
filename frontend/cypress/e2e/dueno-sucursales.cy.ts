describe('Dueño - Sucursales', () => {
  const duenoEmail = 'dueno@polleria.com';
  const duenoPassword = 'Dueno123!';

  const loginDueno = () => {
    cy.visit('/');

    cy.get('input').first().should('not.be.disabled').clear().type(duenoEmail);
    cy.get('input').eq(1).should('not.be.disabled').clear().type(duenoPassword);

    cy.contains('button', 'Entrar')
      .should('not.be.disabled')
      .click();

    cy.location('pathname').should('eq', '/dashboard');
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    loginDueno();

    cy.visit('/sucursales');
    cy.location('pathname').should('eq', '/sucursales');

    cy.contains('Mis sucursales').should('be.visible');
  });

  it('CT-DUENO-02: visualiza el listado de sucursales', () => {
    cy.contains('Mis sucursales').should('be.visible');
    cy.contains('Nueva sucursal').should('be.visible');
    cy.get('#buscar-sucursal').should('be.visible');
    cy.get('#estado-sucursal').should('be.visible');
    cy.contains(/Mostrando/i).should('be.visible');

    cy.wait(3000);
  });

  it('CT-DUENO-03: filtra sucursales por estado', () => {
    cy.get('#estado-sucursal').select('ABIERTAS');
    cy.get('#estado-sucursal').should('have.value', 'ABIERTAS');
    cy.contains(/Mostrando/i).should('be.visible');
    cy.wait(1200);

    cy.get('#estado-sucursal').select('CERRADAS');
    cy.get('#estado-sucursal').should('have.value', 'CERRADAS');
    cy.contains(/Mostrando/i).should('be.visible');
    cy.wait(1200);

    cy.get('#estado-sucursal').select('TODAS');
    cy.get('#estado-sucursal').should('have.value', 'TODAS');
    cy.contains(/Mostrando/i).should('be.visible');
    cy.wait(1200);

  });

  it('CT-DUENO-04: valida errores del formulario de sucursal', () => {
    cy.contains('button', 'Nueva sucursal').click();

    cy.contains('Nueva sucursal').should('be.visible');

    // 1. Validación de nombre corto
    cy.get('#sucursal-nombre').clear().type('LO');
    cy.get('#sucursal-direccion').clear().type('AV. PRUEBA 123');
    cy.get('#sucursal-telefono').clear().type('987654321');
    cy.get('#sucursal-apertura').clear().type('08:00');
    cy.get('#sucursal-cierre').clear().type('22:00');

    cy.contains('button', 'Crear sucursal').click();

    cy.contains(/nombre de la sucursal debe tener al menos 3 caracteres/i)
        .should('be.visible');

    cy.wait(900);

    // 2. Validación de teléfono inválido
    cy.get('#sucursal-nombre').clear().type('LOCAL VALIDACION CYPRESS');
    cy.get('#sucursal-telefono').clear().type('12345678');

    cy.contains('button', 'Crear sucursal').click();

    cy.contains(/teléfono debe tener 7 dígitos|9 dígitos empezando en 9/i)
        .should('be.visible');

    cy.wait(900);

    // 3. Validación de horario inválido
    cy.get('#sucursal-telefono').clear().type('987654321');
    cy.get('#sucursal-apertura').clear().type('22:00');
    cy.get('#sucursal-cierre').clear().type('08:00');

    cy.contains('button', 'Crear sucursal').click();

    cy.contains(/hora de cierre debe ser posterior/i)
        .should('be.visible');

    cy.wait(1200);
  });

  it('CT-DUENO-05: crea una sucursal con datos válidos', () => {
    const timestamp = Date.now();
    const nombreSucursal = `LOCAL CYPRESS ${timestamp}`;

    cy.contains('button', 'Nueva sucursal').click();

    cy.contains('Nueva sucursal').should('be.visible');

    cy.get('#sucursal-nombre').clear().type(nombreSucursal);
    cy.get('#sucursal-direccion').clear().type('AV. CYPRESS 123');
    cy.get('#sucursal-telefono').clear().type('987654321');

    cy.get('#sucursal-apertura').clear().type('08:00');
    cy.get('#sucursal-cierre').clear().type('22:00');

    cy.contains('button', 'Crear sucursal')
        .should('not.be.disabled')
        .click();

    cy.contains(/Sucursal creada/i).should('be.visible');

    cy.get('#buscar-sucursal').clear().type(nombreSucursal);

    cy.contains(nombreSucursal).should('be.visible');

    cy.wait(1500);
  });
});