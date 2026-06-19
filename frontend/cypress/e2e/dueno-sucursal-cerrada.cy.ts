describe('Dueño - Control operativo de sucursal', () => {
  const duenoEmail = 'dueno@polleria.com';
  const duenoPassword = 'Dueno123!';

  const meseroEmail = 'mesero@polleria.com';
  const meseroPassword = 'Mesero123!';

  const sucursalMesero = 'POLLERÍA EL GALLO DE ORO - CENTRO';

  const login = (email: string, password: string) => {
    cy.visit('/');

    cy.get('input').first().should('not.be.disabled').clear().type(email);
    cy.get('input').eq(1).should('not.be.disabled').clear().type(password);

    cy.contains('button', 'Entrar')
      .should('not.be.disabled')
      .click();
  };

  const loginDueno = () => {
    login(duenoEmail, duenoPassword);
    cy.location('pathname').should('eq', '/dashboard');
  };

  const cerrarSesionLocal = () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/login');
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('CT-DUENO-14: controla el acceso del Mesero según el estado operativo de su sucursal', () => {
    // 1. Dueño ingresa y cierra la sucursal del mesero
    loginDueno();

    cy.visit('/sucursales');
    cy.location('pathname').should('eq', '/sucursales');

    cy.get('#buscar-sucursal')
      .clear()
      .type(sucursalMesero);

    cy.contains(sucursalMesero).should('be.visible');

    cy.get('body').then(($body) => {
      if ($body.text().includes('Cerrar local')) {
        cy.contains('button', 'Cerrar local')
          .should('be.visible')
          .click();

        cy.contains('button', 'Sí, cerrar local')
          .should('be.visible')
          .click();

        cy.wait(1500);
      }
    });

    // 2. Mesero intenta ingresar con sucursal cerrada
    cerrarSesionLocal();

    login(meseroEmail, meseroPassword);

    cy.contains(/sucursal.*cerrada|local.*cerrado|no puede operar|cerrada/i, {
      timeout: 10000,
    }).should('be.visible');

    cy.wait(1500);

    // 3. Dueño vuelve a ingresar y reabre la sucursal
    cerrarSesionLocal();

    loginDueno();

    cy.visit('/sucursales');
    cy.location('pathname').should('eq', '/sucursales');

    cy.get('#buscar-sucursal')
      .clear()
      .type(sucursalMesero);

    cy.contains(sucursalMesero).should('be.visible');

    cy.get('body').then(($body) => {
      if ($body.text().includes('Abrir local')) {
        cy.contains('button', 'Abrir local')
          .should('be.visible')
          .click();

        cy.contains('button', 'Sí, abrir local')
          .should('be.visible')
          .click();

        cy.wait(1500);
      }
    });

    cy.contains(/Abierto/i, { timeout: 10000 }).should('exist');

    // 4. Mesero vuelve a ingresar correctamente con sucursal abierta
    cerrarSesionLocal();

    login(meseroEmail, meseroPassword);

    cy.location('pathname', { timeout: 10000 }).should((pathname) => {
      expect(pathname).to.not.eq('/login');
    });

    cy.contains(/sucursal.*cerrada|local.*cerrado|no puede operar|cerrada/i)
      .should('not.exist');

    cy.wait(1500);
  });
});