describe('Dueño - Usuarios', () => {
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

    cy.visit('/usuarios');
    cy.location('pathname').should('eq', '/usuarios');

    cy.contains('Usuarios').should('be.visible');
  });

  it('CT-DUENO-06: visualiza el listado global de usuarios', () => {
    cy.contains('Nuevo usuario').should('be.visible');

    cy.get('#buscar-usuario').should('be.visible');
    cy.get('#filtro-rol-usuario').should('be.visible');
    cy.get('#filtro-estado-usuario').should('be.visible');
    cy.get('#filtro-sucursal-usuario').should('be.visible');

    cy.contains(/Mostrando/i).should('be.visible');

    cy.get('table thead').within(() => {
        cy.contains('Nombre').should('be.visible');
        cy.contains('Rol').should('be.visible');
        cy.contains('Email').should('be.visible');
        cy.contains('Sucursal').should('be.visible');
        cy.contains('Estado').should('be.visible');
    });

    cy.wait(1500);
  });

  it('CT-DUENO-07: filtra usuarios por rol y estado', () => {
    cy.get('#filtro-rol-usuario').select('ADMIN');
    cy.get('#filtro-rol-usuario').should('have.value', 'ADMIN');
    cy.contains(/Mostrando/i).should('be.visible');
    cy.wait(1000);

    cy.get('#filtro-rol-usuario').select('MESERO');
    cy.get('#filtro-rol-usuario').should('have.value', 'MESERO');
    cy.contains(/Mostrando/i).should('be.visible');
    cy.wait(1000);

    cy.get('#filtro-rol-usuario').select('COCINERO');
    cy.get('#filtro-rol-usuario').should('have.value', 'COCINERO');
    cy.contains(/Mostrando/i).should('be.visible');
    cy.wait(1000);

    cy.get('#filtro-estado-usuario').select('ACTIVO');
    cy.get('#filtro-estado-usuario').should('have.value', 'ACTIVO');
    cy.contains(/Mostrando/i).should('be.visible');
    cy.wait(1000);

    cy.get('#filtro-estado-usuario').select('INACTIVO');
    cy.get('#filtro-estado-usuario').should('have.value', 'INACTIVO');
    cy.contains(/Mostrando/i).should('be.visible');
    cy.wait(1000);

    cy.contains('button', 'Limpiar filtros').click();

    cy.get('#filtro-rol-usuario').should('have.value', 'TODOS');
    cy.get('#filtro-estado-usuario').should('have.value', 'TODOS');
    cy.get('#filtro-sucursal-usuario').should('have.value', 'TODAS');

    cy.wait(1200);

  });

  it('CT-DUENO-08: valida errores del formulario de usuario', () => {
    cy.contains('button', 'Nuevo usuario').click();

    cy.contains('Nuevo usuario').should('be.visible');

    // 1. Validación de nombre corto
    cy.get('#usuario-nombre').clear().type('Jo');
    cy.get('#usuario-email').clear().type('usuario.prueba@correo.com');
    cy.get('#usuario-password').clear().type('123456');

    cy.get('#usuario-sucursal option').should('have.length.greaterThan', 1);
    cy.get('#usuario-sucursal').select(1);

    cy.contains('button', 'Crear usuario').click();

    cy.contains(/nombre debe tener al menos 3 caracteres/i)
        .should('be.visible');

    cy.wait(900);

    // 2. Validación de contraseña corta
    cy.get('#usuario-nombre').clear().type('Usuario Cypress');
    cy.get('#usuario-email').clear().type('usuario.prueba@correo.com');
    cy.get('#usuario-password').clear().type('123');

    cy.contains('button', 'Crear usuario').click();

    cy.contains(/contraseña debe tener al menos 6 caracteres/i)
        .should('be.visible');

    cy.wait(900);

    // 3. Validación HTML nativa de email inválido
    cy.get('#usuario-password').clear().type('123456');
    cy.get('#usuario-email').clear().type('correo-invalido');

    cy.contains('button', 'Crear usuario').click();

    cy.get('#usuario-email')
        .should('match', ':invalid');

    cy.wait(1200);

    });

  it('CT-DUENO-09: crea usuario correctamente', () => {
    const nombreUsuario = `Usuario Cypress`;
    const emailUsuario = `usuario.cypress@correo.com`;

    cy.contains('button', 'Nuevo usuario').click();

    cy.contains('Nuevo usuario').should('be.visible');

    cy.get('#usuario-nombre').clear().type(nombreUsuario);
    cy.get('#usuario-email').clear().type(emailUsuario);
    cy.get('#usuario-password').clear().type('Cypress123!');

    cy.get('#usuario-rol').select('MESERO');
    cy.get('#usuario-sucursal').select(1);

    cy.contains('button', 'Crear usuario')
      .should('not.be.disabled')
      .click();

    cy.contains(/Usuario creado/i).should('be.visible');

    cy.get('#buscar-usuario').clear().type(emailUsuario);

    cy.contains(emailUsuario).should('be.visible');
    cy.contains(nombreUsuario).should('be.visible');

    cy.wait(1500);
  });
});