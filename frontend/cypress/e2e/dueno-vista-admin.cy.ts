describe('Dueño - Vista administrador', () => {
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

  const validarVistaAdministradorActiva = () => {
    cy.window().then((win) => {
      const raw = win.localStorage.getItem('restaurantos-vista-administrador');

      expect(raw).to.not.eq(null);

      const data = JSON.parse(raw as string);

      expect(data.state.activo).to.eq(true);
      expect(data.state.sucursalActivaId).to.be.a('string');
      expect(data.state.sucursalActivaNombre).to.be.a('string');
    });
  };

  const entrarVistaAdministrador = () => {
    loginDueno();

    cy.visit('/sucursales');
    cy.location('pathname').should('eq', '/sucursales');

    cy.contains('Mis sucursales').should('be.visible');

    cy.contains('button', 'Vista administrador')
      .first()
      .scrollIntoView()
      .should('be.visible')
      .click();

    cy.location('pathname').should('eq', '/dashboard');

    validarVistaAdministradorActiva();
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('CT-DUENO-10: ingresa a Vista administrador desde una sucursal', () => {
    entrarVistaAdministrador();

    cy.contains('Vista administrador').should('exist');
    cy.contains('Salir de vista administrador').should('exist');

    cy.contains('Personal').should('exist');
    cy.contains('Pedidos').should('exist');
    cy.contains('Mesas').should('exist');
    cy.contains('Asistencias').should('exist');

    cy.wait(1500);
  });

  it('CT-DUENO-11: visualiza pedidos dentro de Vista administrador', () => {
    entrarVistaAdministrador();

    cy.visit('/pedidos');
    cy.location('pathname').should('eq', '/pedidos');

    cy.contains('h1', 'Pedidos').should('be.visible');
    cy.contains('Visualiza y filtra los pedidos registrados').should('be.visible');

    cy.get('input[placeholder="Buscar por mesa o # de pedido"]')
      .should('be.visible');

    cy.contains('button', 'TODOS').should('be.visible');
    cy.contains('button', 'PENDIENTE').should('be.visible');
    cy.contains('button', 'PAGADO').should('be.visible');
    cy.contains('button', 'CANCELADO').should('be.visible');

    cy.contains(/Cargando pedidos|No se encontraron pedidos/i, { timeout: 10000 })
      .should('exist');

    cy.wait(1500);
  });

  it('CT-DUENO-12: filtra pedidos por estado en Vista administrador', () => {
    entrarVistaAdministrador();

    cy.visit('/pedidos');
    cy.location('pathname').should('eq', '/pedidos');

    cy.contains('h1', 'Pedidos').should('be.visible');

    cy.contains('button', 'PENDIENTE').click();
    cy.contains('button', 'PENDIENTE').should('have.class', 'bg-primary');
    cy.wait(1200);

    cy.contains('button', 'PAGADO').click();
    cy.contains('button', 'PAGADO').should('have.class', 'bg-primary');
    cy.wait(1200);

    cy.contains('button', 'CANCELADO').click();
    cy.contains('button', 'CANCELADO').should('have.class', 'bg-primary');
    cy.wait(1200);

    cy.contains('button', 'TODOS').click();
    cy.contains('button', 'TODOS').should('have.class', 'bg-primary');
    cy.wait(1200);
  });

  it('CT-DUENO-13: sale de Vista administrador y vuelve a la vista global', () => {
    entrarVistaAdministrador();

    cy.contains('button', 'Salir de vista administrador')
      .click({ force: true });

    cy.location('pathname').should('eq', '/dashboard');

    cy.window().then((win) => {
      const raw = win.localStorage.getItem('restaurantos-vista-administrador');

      expect(raw).to.not.eq(null);

      const data = JSON.parse(raw as string);

      expect(data.state.activo).to.eq(false);
      expect(data.state.sucursalActivaId).to.eq(null);
      expect(data.state.sucursalActivaNombre).to.eq(null);
    });

    cy.contains('Sucursales').should('exist');
    cy.contains('Usuarios').should('exist');

    cy.wait(1500);
  });
});