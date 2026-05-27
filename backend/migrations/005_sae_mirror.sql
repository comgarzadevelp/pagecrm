-- =============================================================
-- REPLICA ESPEJO COMPLETA DE TODAS LAS TABLAS ASPEL SAE (209 TABLAS)
-- Generado automáticamente: 2026-05-26T18:57:20.729Z
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: acomp03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS acomp03 CASCADE;

CREATE TABLE acomp03 (
  cve_acomp INTEGER,
  cvta_com DOUBLE PRECISION,
  cdescto DOUBLE PRECISION,
  cdes_fin DOUBLE PRECISION,
  cimp DOUBLE PRECISION,
  ctot_ind DOUBLE PRECISION,
  rvta_com DOUBLE PRECISION,
  rdescto DOUBLE PRECISION,
  rdes_fin DOUBLE PRECISION,
  rimp DOUBLE PRECISION,
  rtot_ind DOUBLE PRECISION,
  ovta_com DOUBLE PRECISION,
  odescto DOUBLE PRECISION,
  odes_fin DOUBLE PRECISION,
  oimp DOUBLE PRECISION,
  qvta_com DOUBLE PRECISION,
  qdescto DOUBLE PRECISION,
  qdes_fin DOUBLE PRECISION,
  qimp DOUBLE PRECISION,
  dvta_com DOUBLE PRECISION,
  ddescto DOUBLE PRECISION,
  ddes_fin DOUBLE PRECISION,
  dimp DOUBLE PRECISION,
  dtot_ind DOUBLE PRECISION,
  per_acum TIMESTAMPTZ
);

ALTER TABLE acomp03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: actcam03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS actcam03 CASCADE;

CREATE TABLE actcam03 (
  cve_campania TEXT,
  cve_actividad TEXT,
  prioridad INTEGER,
  orden INTEGER
);

ALTER TABLE actcam03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: activi03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS activi03 CASCADE;

CREATE TABLE activi03 (
  cve_actividad TEXT,
  descr TEXT,
  prioridad INTEGER,
  status TEXT
);

ALTER TABLE activi03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: afact03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS afact03 CASCADE;

CREATE TABLE afact03 (
  cve_afact INTEGER,
  fvta_com DOUBLE PRECISION,
  fdescto DOUBLE PRECISION,
  fdes_fin DOUBLE PRECISION,
  fimp DOUBLE PRECISION,
  fcomi DOUBLE PRECISION,
  rvta_com DOUBLE PRECISION,
  rdescto DOUBLE PRECISION,
  rdes_fin DOUBLE PRECISION,
  rimp DOUBLE PRECISION,
  rcomi DOUBLE PRECISION,
  dvta_com DOUBLE PRECISION,
  ddescto DOUBLE PRECISION,
  ddes_fin DOUBLE PRECISION,
  dimp DOUBLE PRECISION,
  dcomi DOUBLE PRECISION,
  pvta_com DOUBLE PRECISION,
  pdescto DOUBLE PRECISION,
  pdes_fin DOUBLE PRECISION,
  pimp DOUBLE PRECISION,
  pcomi DOUBLE PRECISION,
  cvta_com DOUBLE PRECISION,
  cdescto DOUBLE PRECISION,
  cdes_fin DOUBLE PRECISION,
  cimp DOUBLE PRECISION,
  ccomi DOUBLE PRECISION,
  vvta_com DOUBLE PRECISION,
  vdescto DOUBLE PRECISION,
  vdes_fin DOUBLE PRECISION,
  vimp DOUBLE PRECISION,
  vcomi DOUBLE PRECISION,
  wvta_com DOUBLE PRECISION,
  wdescto DOUBLE PRECISION,
  wdes_fin DOUBLE PRECISION,
  wimp DOUBLE PRECISION,
  wcomi DOUBLE PRECISION,
  per_acum TIMESTAMPTZ,
  evta_com DOUBLE PRECISION,
  edescto DOUBLE PRECISION,
  edes_fin DOUBLE PRECISION,
  eimp DOUBLE PRECISION,
  ecomi DOUBLE PRECISION
);

ALTER TABLE afact03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: alerta03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS alerta03 CASCADE;

CREATE TABLE alerta03 (
  cve_alerta INTEGER,
  mensaje TEXT,
  cant_doc INTEGER
);

ALTER TABLE alerta03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: alerta_usuario03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS alerta_usuario03 CASCADE;

CREATE TABLE alerta_usuario03 (
  cve_alerta INTEGER,
  id_usuario INTEGER,
  activa TEXT,
  sig_fecha TIMESTAMPTZ
);

ALTER TABLE alerta_usuario03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: almacenes03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS almacenes03 CASCADE;

CREATE TABLE almacenes03 (
  cve_alm INTEGER,
  descr TEXT,
  direccion TEXT,
  encargado TEXT,
  telefono TEXT,
  lista_prec INTEGER,
  cuen_cont TEXT,
  cve_ment INTEGER,
  cve_msal INTEGER,
  status TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  ubi_dest TEXT,
  coi_sinc TIMESTAMPTZ
);

ALTER TABLE almacenes03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: autorizac03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS autorizac03 CASCADE;

CREATE TABLE autorizac03 (
  cve_aut INTEGER,
  docto_aut TEXT,
  num_aut TEXT,
  mes_venc INTEGER,
  anio_venc INTEGER
);

ALTER TABLE autorizac03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: autorizap03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS autorizap03 CASCADE;

CREATE TABLE autorizap03 (
  cve_aut INTEGER,
  docto_aut TEXT,
  num_aut TEXT,
  mes_venc INTEGER,
  anio_venc INTEGER
);

ALTER TABLE autorizap03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: bita03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS bita03 CASCADE;

CREATE TABLE bita03 (
  cve_bita INTEGER,
  cve_clie TEXT,
  cve_campania TEXT,
  cve_actividad TEXT,
  fechahora TIMESTAMPTZ,
  cve_usuario INTEGER,
  observaciones TEXT,
  status TEXT,
  nom_usuario TEXT
);

ALTER TABLE bita03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: camp03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS camp03 CASCADE;

CREATE TABLE camp03 (
  cve_campania TEXT,
  descrip TEXT,
  filtrar_auto TEXT,
  leyenda TEXT,
  status TEXT,
  fechad TIMESTAMPTZ,
  fechah TIMESTAMPTZ,
  origen TEXT,
  tipo TEXT
);

ALTER TABLE camp03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: campfil03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS campfil03 CASCADE;

CREATE TABLE campfil03 (
  cve_campania TEXT,
  cmb_vigencia INTEGER,
  criterios_clien INTEGER,
  clie_desde TEXT,
  clie_hasta TEXT,
  clasificacion TEXT,
  vendedor TEXT,
  zona TEXT,
  estatus TEXT,
  cmb_venta_anual INTEGER,
  venta_anual DOUBLE PRECISION,
  cmb_descuento INTEGER,
  descuento DOUBLE PRECISION,
  cmb_saldo INTEGER,
  saldo DOUBLE PRECISION,
  chk_limite TEXT,
  cmb_porcentaje_lim INTEGER,
  cmb_dias_cartera INTEGER,
  dias INTEGER,
  chk_dias INTEGER,
  cmb_dias_credito INTEGER,
  fech_inicial_ultcompr TIMESTAMPTZ,
  fech_final_ultcompr TIMESTAMPTZ,
  cmb_ultimacompra INTEGER,
  fech_inicial_aplic TIMESTAMPTZ,
  fech_final_aplic TIMESTAMPTZ,
  cmb_aplic INTEGER,
  docs_desde TEXT,
  docs_hasta TEXT,
  folios_desde TEXT,
  folios_hasta TEXT,
  conceptos TEXT,
  periodo TEXT,
  fech_periodo_inicial TIMESTAMPTZ,
  fech_periodo_final TIMESTAMPTZ,
  cmb_periodo INTEGER,
  tipoventa INTEGER,
  ventas_desde TEXT,
  ventas_hasta TEXT,
  ventas_vendedor TEXT,
  ventas_moneda TEXT,
  ventas_almacen TEXT,
  ventas_fech_inicial TIMESTAMPTZ,
  ventas_fech_final TIMESTAMPTZ,
  cmb_ventas INTEGER,
  chk_cancelaciones TEXT,
  cmb_importe_venta INTEGER,
  importe_venta DOUBLE PRECISION,
  prod_desde TEXT,
  prod_hasta TEXT,
  prod_linea TEXT,
  inv_prod TEXT,
  inv_grupop TEXT,
  inv_kits TEXT,
  inv_serv TEXT,
  cmb_cantidad INTEGER,
  inv_cant DOUBLE PRECISION,
  guia TEXT
);

ALTER TABLE campfil03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: capas_x_mov03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS capas_x_mov03 CASCADE;

CREATE TABLE capas_x_mov03 (
  cve_art TEXT,
  num_mov INTEGER,
  num_mov_aft INTEGER,
  cant_aft DOUBLE PRECISION,
  costo_aft DOUBLE PRECISION
);

ALTER TABLE capas_x_mov03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cartaporte03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cartaporte03 CASCADE;

CREATE TABLE cartaporte03 (
  clave_doc TEXT,
  tipo_doc TEXT,
  xml_complemento TEXT
);

ALTER TABLE cartaporte03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cfdi03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cfdi03 CASCADE;

CREATE TABLE cfdi03 (
  tipo_doc TEXT,
  cve_doc TEXT,
  version TEXT,
  uuid TEXT,
  no_serie TEXT,
  fecha_cert TEXT,
  fecha_cancela TEXT,
  xml_doc TEXT,
  xml_doc_cancela TEXT,
  desgloceimp1 TEXT,
  desgloceimp2 TEXT,
  desgloceimp3 TEXT,
  desgloceimp4 TEXT,
  msj_canc TEXT,
  pendiente TEXT,
  cve_usuario INTEGER,
  motivo_canc TEXT,
  uuid_rel TEXT,
  desgloceimp8 TEXT,
  desgloceimp7 TEXT,
  desgloceimp6 TEXT,
  desgloceimp5 TEXT,
  en_tablero TEXT
);

ALTER TABLE cfdi03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cfdic03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cfdic03 CASCADE;

CREATE TABLE cfdic03 (
  tipo_doc TEXT,
  cve_doc TEXT,
  id_timbrado TEXT,
  fecha_timbrado TEXT,
  folio_timbrado TEXT,
  serie_timbrado TEXT,
  rfc_emisor TEXT,
  rfc_receptor TEXT,
  monto DOUBLE PRECISION,
  xml_doc TEXT,
  respuesta TEXT,
  xml_acuse TEXT,
  version TEXT,
  importacion TEXT
);

ALTER TABLE cfdic03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cfdi_rel03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cfdi_rel03 CASCADE;

CREATE TABLE cfdi_rel03 (
  uuid TEXT,
  tip_rel TEXT,
  cve_doc TEXT,
  cve_doc_rel TEXT,
  tip_doc TEXT,
  no_serie TEXT,
  folio TEXT,
  fecha_cert TEXT
);

ALTER TABLE cfdi_rel03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cfglin03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cfglin03 CASCADE;

CREATE TABLE cfglin03 (
  cve_lin TEXT,
  long1 INTEGER,
  sep1 TEXT,
  long2 INTEGER,
  sep2 TEXT,
  long3 INTEGER
);

ALTER TABLE cfglin03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: citas03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS citas03 CASCADE;

CREATE TABLE citas03 (
  cve_clie TEXT,
  asunto TEXT,
  id_outlook TEXT,
  fecha_hora TIMESTAMPTZ,
  status TEXT,
  usuario TEXT,
  cve_cita INTEGER
);

ALTER TABLE citas03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: clicam03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS clicam03 CASCADE;

CREATE TABLE clicam03 (
  cve_campania TEXT,
  cve_clie TEXT,
  cve_actividad TEXT,
  cve_resultado TEXT,
  fecha TIMESTAMPTZ,
  prioridad INTEGER,
  status TEXT,
  comentarios TEXT,
  status_actividad INTEGER
);

ALTER TABLE clicam03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: clie03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS clie03 CASCADE;

CREATE TABLE clie03 (
  clave TEXT,
  status TEXT,
  nombre TEXT,
  rfc TEXT,
  calle TEXT,
  numint TEXT,
  numext TEXT,
  cruzamientos TEXT,
  cruzamientos2 TEXT,
  colonia TEXT,
  codigo TEXT,
  localidad TEXT,
  municipio TEXT,
  estado TEXT,
  pais TEXT,
  nacionalidad TEXT,
  referdir TEXT,
  telefono TEXT,
  clasific TEXT,
  fax TEXT,
  pag_web TEXT,
  curp TEXT,
  cve_zona TEXT,
  imprir TEXT,
  mail TEXT,
  nivelsec INTEGER,
  enviosilen TEXT,
  emailpred TEXT,
  diarev TEXT,
  diapago TEXT,
  con_credito TEXT,
  diascred INTEGER,
  limcred DOUBLE PRECISION,
  saldo DOUBLE PRECISION,
  lista_prec INTEGER,
  cve_bita INTEGER,
  ult_pagod TEXT,
  ult_pagom DOUBLE PRECISION,
  ult_pagof TIMESTAMPTZ,
  descuento DOUBLE PRECISION,
  ult_ventad TEXT,
  ult_compm DOUBLE PRECISION,
  fch_ultcom TIMESTAMPTZ,
  ventas DOUBLE PRECISION,
  cve_vend TEXT,
  cve_obs INTEGER,
  tipo_empresa TEXT,
  matriz TEXT,
  prospecto TEXT,
  calle_envio TEXT,
  numint_envio TEXT,
  numext_envio TEXT,
  cruzamientos_envio TEXT,
  cruzamientos_envio2 TEXT,
  colonia_envio TEXT,
  localidad_envio TEXT,
  municipio_envio TEXT,
  estado_envio TEXT,
  pais_envio TEXT,
  codigo_envio TEXT,
  cve_zona_envio TEXT,
  referencia_envio TEXT,
  cuenta_contable TEXT,
  addendaf TEXT,
  addendad TEXT,
  namespace TEXT,
  metododepago TEXT,
  numctapago TEXT,
  modelo TEXT,
  des_impu1 TEXT,
  des_impu2 TEXT,
  des_impu3 TEXT,
  des_impu4 TEXT,
  des_per TEXT,
  lat_general DOUBLE PRECISION,
  lon_general DOUBLE PRECISION,
  lat_envio DOUBLE PRECISION,
  lon_envio DOUBLE PRECISION,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  uso_cfdi TEXT,
  cve_pais_sat TEXT,
  numidregfiscal TEXT,
  formadepagosat TEXT,
  addendae TEXT,
  addendag TEXT,
  addendat TEXT,
  ubicacion_r TEXT,
  reg_fisc TEXT,
  val_rfc INTEGER,
  nombrecomercial TEXT,
  des_impu8 TEXT,
  des_impu7 TEXT,
  des_impu6 TEXT,
  des_impu5 TEXT,
  coi_sinc TIMESTAMPTZ,
  cuenta_contable2 TEXT
);

ALTER TABLE clie03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: clie_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS clie_clib03 CASCADE;

CREATE TABLE clie_clib03 (
  cve_clie TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 INTEGER,
  camplib5 DOUBLE PRECISION,
  camplib6 DOUBLE PRECISION,
  camplib7 TEXT
);

ALTER TABLE clie_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: clie_tienda03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS clie_tienda03 CASCADE;

CREATE TABLE clie_tienda03 (
  cve_comp TEXT,
  clave TEXT,
  cve_tienda TEXT
);

ALTER TABLE clie_tienda03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: clin03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS clin03 CASCADE;

CREATE TABLE clin03 (
  cve_lin TEXT,
  desc_lin TEXT,
  esungpo TEXT,
  cuenta_coi TEXT,
  status TEXT,
  coi_sinc TIMESTAMPTZ,
  uuid TEXT
);

ALTER TABLE clin03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cnsest03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cnsest03 CASCADE;

CREATE TABLE cnsest03 (
  cve_estad INTEGER,
  titulo TEXT,
  usuario INTEGER,
  fecha TIMESTAMPTZ,
  tipo TEXT,
  archivo TEXT,
  ver_filtro TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  disponible_movil TEXT
);

ALTER TABLE cnsest03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: coi_xml03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS coi_xml03 CASCADE;

CREATE TABLE coi_xml03 (
  ctlcoi INTEGER,
  fecha_sinc TIMESTAMPTZ,
  id_sinc TEXT,
  xml_doc TEXT,
  tipo_doc TEXT,
  status TEXT,
  fecha_doc TIMESTAMPTZ,
  cve_doc TEXT,
  uuid TEXT
);

ALTER TABLE coi_xml03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: color03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS color03 CASCADE;

CREATE TABLE color03 (
  cve_lin TEXT,
  valor TEXT,
  descrip TEXT
);

ALTER TABLE color03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compactacion03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compactacion03 CASCADE;

CREATE TABLE compactacion03 (
  ult_compactacion TIMESTAMPTZ
);

ALTER TABLE compactacion03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compc03 CASCADE;

CREATE TABLE compc03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  su_refer TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_rec TIMESTAMPTZ,
  fecha_pag TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  tot_ind DOUBLE PRECISION,
  obs_cond TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxp TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  serie TEXT,
  folio INTEGER,
  ctlpol INTEGER,
  escfd TEXT,
  contado TEXT,
  bloq TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  formaenvio TEXT,
  metododepago TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE compc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compc_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compc_clib03 CASCADE;

CREATE TABLE compc_clib03 (
  clave_doc TEXT
);

ALTER TABLE compc_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compd03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compd03 CASCADE;

CREATE TABLE compd03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  su_refer TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_rec TIMESTAMPTZ,
  fecha_pag TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  tot_ind DOUBLE PRECISION,
  obs_cond TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxp TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  serie TEXT,
  folio INTEGER,
  ctlpol INTEGER,
  escfd TEXT,
  contado TEXT,
  bloq TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  formaenvio TEXT,
  metododepago TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE compd03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compd_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compd_clib03 CASCADE;

CREATE TABLE compd_clib03 (
  clave_doc TEXT
);

ALTER TABLE compd_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compo03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compo03 CASCADE;

CREATE TABLE compo03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  su_refer TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_rec TIMESTAMPTZ,
  fecha_pag TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  tot_ind DOUBLE PRECISION,
  obs_cond TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxp TEXT,
  act_coi TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  serie TEXT,
  folio INTEGER,
  ctlpol INTEGER,
  escfd TEXT,
  contado TEXT,
  bloq TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  formaenvio TEXT,
  metododepago TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE compo03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compo_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compo_clib03 CASCADE;

CREATE TABLE compo_clib03 (
  clave_doc TEXT
);

ALTER TABLE compo_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compq03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compq03 CASCADE;

CREATE TABLE compq03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  su_refer TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_rec TIMESTAMPTZ,
  fecha_pag TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  tot_ind DOUBLE PRECISION,
  obs_cond TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxp TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  serie TEXT,
  folio INTEGER,
  ctlpol INTEGER,
  escfd TEXT,
  contado TEXT,
  bloq TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  formaenvio TEXT,
  metododepago TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE compq03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compq_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compq_clib03 CASCADE;

CREATE TABLE compq_clib03 (
  clave_doc TEXT
);

ALTER TABLE compq_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compr03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compr03 CASCADE;

CREATE TABLE compr03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  su_refer TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_rec TIMESTAMPTZ,
  fecha_pag TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  tot_ind DOUBLE PRECISION,
  obs_cond TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxp TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  serie TEXT,
  folio INTEGER,
  ctlpol INTEGER,
  escfd TEXT,
  contado TEXT,
  bloq TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  formaenvio TEXT,
  metododepago TEXT,
  imp_tot5 DOUBLE PRECISION,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE compr03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: compr_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS compr_clib03 CASCADE;

CREATE TABLE compr_clib03 (
  clave_doc TEXT
);

ALTER TABLE compr_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: com_exterior03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS com_exterior03 CASCADE;

CREATE TABLE com_exterior03 (
  clave_doc TEXT,
  tipo_doc TEXT,
  xml_complemento TEXT
);

ALTER TABLE com_exterior03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: conc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS conc03 CASCADE;

CREATE TABLE conc03 (
  num_cpto INTEGER,
  descr TEXT,
  tipo TEXT,
  cuen_cont TEXT,
  con_refer TEXT,
  gen_cpto INTEGER,
  autorizacion TEXT,
  signo INTEGER,
  es_fma_pag TEXT,
  cve_bita INTEGER,
  status TEXT,
  enlinea INTEGER,
  dar_cambio TEXT,
  uuid TEXT,
  formadepagosat TEXT,
  version_sinc TIMESTAMPTZ,
  config_codi TEXT
);

ALTER TABLE conc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: config_envios03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS config_envios03 CASCADE;

CREATE TABLE config_envios03 (
  cve_art TEXT,
  num_env INTEGER,
  descr TEXT,
  costo DOUBLE PRECISION
);

ALTER TABLE config_envios03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: conm03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS conm03 CASCADE;

CREATE TABLE conm03 (
  cve_cpto INTEGER,
  descr TEXT,
  cpn TEXT,
  cuen_cont TEXT,
  tipo_mov TEXT,
  status TEXT,
  signo INTEGER
);

ALTER TABLE conm03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: conp03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS conp03 CASCADE;

CREATE TABLE conp03 (
  num_cpto INTEGER,
  descr TEXT,
  tipo TEXT,
  cuen_cont TEXT,
  con_refer TEXT,
  gen_cpto INTEGER,
  autorizacion TEXT,
  signo INTEGER,
  es_fma_pag TEXT,
  cve_bita INTEGER,
  status TEXT,
  formadepagosat TEXT
);

ALTER TABLE conp03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cons_per03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cons_per03 CASCADE;

CREATE TABLE cons_per03 (
  cve_cons INTEGER,
  titulo TEXT,
  usuario INTEGER,
  tipo INTEGER,
  archivo TEXT
);

ALTER TABLE cons_per03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: contac03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS contac03 CASCADE;

CREATE TABLE contac03 (
  cve_clie TEXT,
  ncontacto INTEGER,
  nombre TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  tipocontac TEXT,
  status TEXT,
  usuario TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  subtipocont TEXT,
  tip_fig TEXT
);

ALTER TABLE contac03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: contap03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS contap03 CASCADE;

CREATE TABLE contap03 (
  ncontacto INTEGER,
  cve_prov TEXT,
  nombre TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  tipocontac TEXT,
  status TEXT,
  usuario TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  subtipocont TEXT
);

ALTER TABLE contap03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ctaesq03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ctaesq03 CASCADE;

CREATE TABLE ctaesq03 (
  num_impu INTEGER,
  porcentaje DOUBLE PRECISION,
  cuen_vent TEXT,
  cuen_comp TEXT
);

ALTER TABLE ctaesq03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ctrlbloqueo03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ctrlbloqueo03 CASCADE;

CREATE TABLE ctrlbloqueo03 (
  usuarios INTEGER,
  bloqueada TEXT
);

ALTER TABLE ctrlbloqueo03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ctrl_elimina03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ctrl_elimina03 CASCADE;

CREATE TABLE ctrl_elimina03 (
  tabla TEXT,
  uuid_reg TEXT,
  version_sinc TIMESTAMPTZ,
  uuid TEXT
);

ALTER TABLE ctrl_elimina03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cuenta_benef03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cuenta_benef03 CASCADE;

CREATE TABLE cuenta_benef03 (
  cuenta_bancaria TEXT,
  rfc_banco TEXT,
  nombre_banco TEXT,
  clave TEXT
);

ALTER TABLE cuenta_benef03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cuenta_ord03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cuenta_ord03 CASCADE;

CREATE TABLE cuenta_ord03 (
  cuenta_bancaria TEXT,
  rfc_banco TEXT,
  nombre_banco TEXT,
  clave TEXT
);

ALTER TABLE cuenta_ord03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cuen_det03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cuen_det03 CASCADE;

CREATE TABLE cuen_det03 (
  cve_clie TEXT,
  refer TEXT,
  id_mov INTEGER,
  num_cpto INTEGER,
  num_cargo INTEGER,
  cve_obs INTEGER,
  no_factura TEXT,
  docto TEXT,
  importe DOUBLE PRECISION,
  fecha_apli TIMESTAMPTZ,
  fecha_venc TIMESTAMPTZ,
  afec_coi TEXT,
  strcvevend TEXT,
  num_moned INTEGER,
  tcambio DOUBLE PRECISION,
  impmon_ext DOUBLE PRECISION,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  cve_folio TEXT,
  tipo_mov TEXT,
  cve_bita INTEGER,
  signo INTEGER,
  cve_aut INTEGER,
  usuario INTEGER,
  operacionpl TEXT,
  ref_sist TEXT,
  no_partida INTEGER,
  refbanco_origen TEXT,
  refbanco_dest TEXT,
  numctapago_origen TEXT,
  numctapago_destino TEXT,
  numcheque TEXT,
  beneficiario TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_operacion TEXT,
  cve_doc_comppago TEXT,
  usuariogl INTEGER,
  ctlcoi INTEGER,
  cta_banca_destino TEXT
);

ALTER TABLE cuen_det03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cuen_m03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cuen_m03 CASCADE;

CREATE TABLE cuen_m03 (
  cve_clie TEXT,
  refer TEXT,
  num_cpto INTEGER,
  num_cargo INTEGER,
  cve_obs INTEGER,
  no_factura TEXT,
  docto TEXT,
  importe DOUBLE PRECISION,
  fecha_apli TIMESTAMPTZ,
  fecha_venc TIMESTAMPTZ,
  afec_coi TEXT,
  strcvevend TEXT,
  num_moned INTEGER,
  tcambio DOUBLE PRECISION,
  impmon_ext DOUBLE PRECISION,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  cve_folio TEXT,
  tipo_mov TEXT,
  cve_bita INTEGER,
  signo INTEGER,
  cve_aut INTEGER,
  usuario INTEGER,
  entregada TEXT,
  fecha_entrega TIMESTAMPTZ,
  status TEXT,
  ref_sist TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  usuariogl INTEGER,
  ctlcoi INTEGER
);

ALTER TABLE cuen_m03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: cves_alter03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cves_alter03 CASCADE;

CREATE TABLE cves_alter03 (
  cve_art TEXT,
  cve_alter TEXT,
  tipo TEXT,
  cve_clpv TEXT
);

ALTER TABLE cves_alter03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: desact03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS desact03 CASCADE;

CREATE TABLE desact03 (
  cve_campania TEXT,
  cve_actividad TEXT,
  descr TEXT
);

ALTER TABLE desact03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: doctosigc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS doctosigc03 CASCADE;

CREATE TABLE doctosigc03 (
  tip_doc TEXT,
  cve_doc TEXT,
  ant_sig TEXT,
  tip_doc_e TEXT,
  cve_doc_e TEXT,
  partida INTEGER,
  part_e INTEGER,
  cant_e DOUBLE PRECISION
);

ALTER TABLE doctosigc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: doctosigf03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS doctosigf03 CASCADE;

CREATE TABLE doctosigf03 (
  tip_doc TEXT,
  cve_doc TEXT,
  ant_sig TEXT,
  tip_doc_e TEXT,
  cve_doc_e TEXT,
  partida INTEGER,
  part_e INTEGER,
  cant_e DOUBLE PRECISION
);

ALTER TABLE doctosigf03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: doctosigfc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS doctosigfc03 CASCADE;

CREATE TABLE doctosigfc03 (
  tip_doc TEXT,
  cve_doc TEXT,
  ant_sig TEXT,
  tip_doc_e TEXT,
  cve_doc_e TEXT,
  partida INTEGER,
  part_e INTEGER,
  cant_e DOUBLE PRECISION
);

ALTER TABLE doctosigfc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: enlacefc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS enlacefc03 CASCADE;

CREATE TABLE enlacefc03 (
  tip_doc TEXT,
  cve_doc TEXT,
  ant_sig TEXT,
  tip_doc_e TEXT,
  cve_doc_e TEXT
);

ALTER TABLE enlacefc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: enlace_ltpd03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS enlace_ltpd03 CASCADE;

CREATE TABLE enlace_ltpd03 (
  e_ltpd INTEGER,
  reg_ltpd INTEGER,
  cantidad DOUBLE PRECISION,
  pxrs DOUBLE PRECISION
);

ALTER TABLE enlace_ltpd03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: facta03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS facta03 CASCADE;

CREATE TABLE facta03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  num_alm_des INTEGER,
  tip_traslado TEXT,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION
);

ALTER TABLE facta03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: facta_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS facta_clib03 CASCADE;

CREATE TABLE facta_clib03 (
  clave_doc TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 TEXT
);

ALTER TABLE facta_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factc03 CASCADE;

CREATE TABLE factc03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  autoriza INTEGER,
  folio INTEGER,
  serie TEXT,
  autoanio TEXT,
  escfd TEXT,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  can_tot DOUBLE PRECISION,
  cve_vend TEXT,
  fecha_cancela TIMESTAMPTZ,
  des_tot DOUBLE PRECISION,
  condicion TEXT,
  num_pagos INTEGER,
  dat_envio INTEGER,
  contado TEXT,
  dat_mostr INTEGER,
  cve_bita INTEGER,
  bloq TEXT,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  cve_obs INTEGER,
  enlazado TEXT,
  tip_doc_e TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  imp_tot5 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factc_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factc_clib03 CASCADE;

CREATE TABLE factc_clib03 (
  clave_doc TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 TEXT
);

ALTER TABLE factc_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factd03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factd03 CASCADE;

CREATE TABLE factd03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  dat_mostr INTEGER,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factd03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factd_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factd_clib03 CASCADE;

CREATE TABLE factd_clib03 (
  clave_doc TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 TEXT
);

ALTER TABLE factd_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: facte03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS facte03 CASCADE;

CREATE TABLE facte03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  imp_tot6 DOUBLE PRECISION,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE facte03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: facte_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS facte_clib03 CASCADE;

CREATE TABLE facte_clib03 (
  clave_doc TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 TEXT
);

ALTER TABLE facte_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factf03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factf03 CASCADE;

CREATE TABLE factf03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factf03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factf_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factf_clib03 CASCADE;

CREATE TABLE factf_clib03 (
  clave_doc TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 TEXT
);

ALTER TABLE factf_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factg03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factg03 CASCADE;

CREATE TABLE factg03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  reg_fisc TEXT,
  ctlcoi INTEGER
);

ALTER TABLE factg03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factg_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factg_clib03 CASCADE;

CREATE TABLE factg_clib03 (
  clave_doc TEXT,
  camplib1 TEXT,
  camplib2 TEXT
);

ALTER TABLE factg_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factp03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factp03 CASCADE;

CREATE TABLE factp03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  num_alm_des INTEGER,
  tip_traslado TEXT,
  imp_tot8 DOUBLE PRECISION,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factp03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factp_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factp_clib03 CASCADE;

CREATE TABLE factp_clib03 (
  clave_doc TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 TEXT
);

ALTER TABLE factp_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factr03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factr03 CASCADE;

CREATE TABLE factr03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factr03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factr_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factr_clib03 CASCADE;

CREATE TABLE factr_clib03 (
  clave_doc TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 TEXT
);

ALTER TABLE factr_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factt03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factt03 CASCADE;

CREATE TABLE factt03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  num_alm_des INTEGER,
  tip_traslado TEXT,
  imp_tot5 DOUBLE PRECISION,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factt03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factt_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factt_clib03 CASCADE;

CREATE TABLE factt_clib03 (
  clave_doc TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 TEXT
);

ALTER TABLE factt_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factv03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factv03 CASCADE;

CREATE TABLE factv03 (
  tip_doc TEXT,
  cve_doc TEXT,
  cve_clpv TEXT,
  status TEXT,
  dat_mostr INTEGER,
  cve_vend TEXT,
  cve_pedi TEXT,
  fecha_doc TIMESTAMPTZ,
  fecha_ent TIMESTAMPTZ,
  fecha_ven TIMESTAMPTZ,
  fecha_cancela TIMESTAMPTZ,
  can_tot DOUBLE PRECISION,
  imp_tot1 DOUBLE PRECISION,
  imp_tot2 DOUBLE PRECISION,
  imp_tot3 DOUBLE PRECISION,
  imp_tot4 DOUBLE PRECISION,
  des_tot DOUBLE PRECISION,
  des_fin DOUBLE PRECISION,
  com_tot DOUBLE PRECISION,
  condicion TEXT,
  cve_obs INTEGER,
  num_alma INTEGER,
  act_cxc TEXT,
  act_coi TEXT,
  enlazado TEXT,
  tip_doc_e TEXT,
  num_moned INTEGER,
  tipcamb DOUBLE PRECISION,
  num_pagos INTEGER,
  fechaelab TIMESTAMPTZ,
  primerpago DOUBLE PRECISION,
  rfc TEXT,
  ctlpol INTEGER,
  escfd TEXT,
  autoriza INTEGER,
  serie TEXT,
  folio INTEGER,
  autoanio TEXT,
  dat_envio INTEGER,
  contado TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  formaenvio TEXT,
  des_fin_porc DOUBLE PRECISION,
  des_tot_porc DOUBLE PRECISION,
  importe DOUBLE PRECISION,
  com_tot_porc DOUBLE PRECISION,
  metododepago TEXT,
  numctapago TEXT,
  tip_doc_ant TEXT,
  doc_ant TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  formadepagosat TEXT,
  uso_cfdi TEXT,
  tip_traslado TEXT,
  num_alm_des INTEGER,
  reg_fisc TEXT,
  tip_fac TEXT,
  imp_tot8 DOUBLE PRECISION,
  imp_tot7 DOUBLE PRECISION,
  imp_tot6 DOUBLE PRECISION,
  imp_tot5 DOUBLE PRECISION,
  ctlcoi INTEGER
);

ALTER TABLE factv03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: factv_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS factv_clib03 CASCADE;

CREATE TABLE factv_clib03 (
  clave_doc TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 TEXT
);

ALTER TABLE factv_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: fact_global03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS fact_global03 CASCADE;

CREATE TABLE fact_global03 (
  clave_doc TEXT,
  periodicidad TEXT,
  meses TEXT,
  anio INTEGER
);

ALTER TABLE fact_global03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: folcxc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS folcxc03 CASCADE;

CREATE TABLE folcxc03 (
  cve_folio TEXT,
  impuesto1 DOUBLE PRECISION,
  impuesto2 DOUBLE PRECISION,
  impuesto3 DOUBLE PRECISION,
  impuesto4 DOUBLE PRECISION,
  referencia TEXT,
  status TEXT,
  fecha TIMESTAMPTZ,
  fechaelab TIMESTAMPTZ,
  usuario INTEGER
);

ALTER TABLE folcxc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: folcxp03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS folcxp03 CASCADE;

CREATE TABLE folcxp03 (
  cve_folio TEXT,
  impuesto1 DOUBLE PRECISION,
  impuesto2 DOUBLE PRECISION,
  impuesto3 DOUBLE PRECISION,
  impuesto4 DOUBLE PRECISION,
  referencia TEXT,
  status TEXT,
  fecha TIMESTAMPTZ,
  fechaelab TIMESTAMPTZ,
  usuario INTEGER
);

ALTER TABLE folcxp03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: foliosc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS foliosc03 CASCADE;

CREATE TABLE foliosc03 (
  tip_doc TEXT,
  foliodesde INTEGER,
  foliohasta INTEGER,
  serie TEXT,
  ult_doc INTEGER,
  fech_ult_doc TIMESTAMPTZ,
  status TEXT
);

ALTER TABLE foliosc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: folioscxc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS folioscxc03 CASCADE;

CREATE TABLE folioscxc03 (
  cve_folio TEXT,
  ult_folio INTEGER
);

ALTER TABLE folioscxc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: folioscxp03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS folioscxp03 CASCADE;

CREATE TABLE folioscxp03 (
  cve_folio TEXT,
  ult_folio INTEGER
);

ALTER TABLE folioscxp03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: foliosf03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS foliosf03 CASCADE;

CREATE TABLE foliosf03 (
  tip_doc TEXT,
  foliodesde INTEGER,
  foliohasta INTEGER,
  autoriza INTEGER,
  serie TEXT,
  autoanio TEXT,
  ult_doc INTEGER,
  tipo TEXT,
  fech_ult_doc TIMESTAMPTZ,
  cbb TEXT,
  fechaaprobcbb TIMESTAMPTZ,
  imgcbb TEXT,
  foliopersonalizado TEXT,
  parcialidad TEXT,
  status TEXT
);

ALTER TABLE foliosf03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: foto_inve03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS foto_inve03 CASCADE;

CREATE TABLE foto_inve03 (
  cve_art TEXT,
  foto TEXT
);

ALTER TABLE foto_inve03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: guicam03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS guicam03 CASCADE;

CREATE TABLE guicam03 (
  cve_campania TEXT,
  guia TEXT
);

ALTER TABLE guicam03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: hnumser03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS hnumser03 CASCADE;

CREATE TABLE hnumser03 (
  cve_art TEXT,
  num_ser TEXT,
  tip_mov INTEGER,
  tip_doc TEXT,
  cve_doc TEXT,
  almacen INTEGER,
  reg_serie INTEGER,
  fecha TIMESTAMPTZ,
  status TEXT,
  no_par INTEGER
);

ALTER TABLE hnumser03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: img_articulo03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS img_articulo03 CASCADE;

CREATE TABLE img_articulo03 (
  cve_art TEXT,
  num_img INTEGER,
  id_img TEXT,
  nom_img TEXT
);

ALTER TABLE img_articulo03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: impu03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS impu03 CASCADE;

CREATE TABLE impu03 (
  cve_esqimpu INTEGER,
  descripesq TEXT,
  impuesto1 DOUBLE PRECISION,
  imp1aplica INTEGER,
  impuesto2 DOUBLE PRECISION,
  imp2aplica INTEGER,
  impuesto3 DOUBLE PRECISION,
  imp3aplica INTEGER,
  impuesto4 DOUBLE PRECISION,
  imp4aplica INTEGER,
  status TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  impuesto6 DOUBLE PRECISION,
  imp8aplica INTEGER,
  impuesto8 DOUBLE PRECISION,
  imp7aplica INTEGER,
  impuesto7 DOUBLE PRECISION,
  imp6aplica INTEGER,
  imp5aplica INTEGER,
  impuesto5 DOUBLE PRECISION
);

ALTER TABLE impu03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: infcli03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS infcli03 CASCADE;

CREATE TABLE infcli03 (
  cve_info INTEGER,
  nombre TEXT,
  calle TEXT,
  numint TEXT,
  numext TEXT,
  cruzamientos TEXT,
  cruzamientos2 TEXT,
  colonia TEXT,
  pob TEXT,
  curp TEXT,
  cve_zona TEXT,
  cve_obs INTEGER,
  referdir TEXT,
  codigo TEXT,
  estado TEXT,
  pais TEXT,
  municipio TEXT,
  rfc TEXT,
  cve_pais_sat TEXT,
  reg_fisc TEXT
);

ALTER TABLE infcli03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: infenvio03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS infenvio03 CASCADE;

CREATE TABLE infenvio03 (
  cve_info INTEGER,
  cve_cons TEXT,
  nombre TEXT,
  calle TEXT,
  numint TEXT,
  numext TEXT,
  cruzamientos TEXT,
  cruzamientos2 TEXT,
  pob TEXT,
  curp TEXT,
  referdir TEXT,
  cve_zona TEXT,
  cve_obs INTEGER,
  strnoguia TEXT,
  strmodoenv TEXT,
  fecha_env TIMESTAMPTZ,
  nombre_recep TEXT,
  no_recep TEXT,
  fecha_recep TIMESTAMPTZ,
  colonia TEXT,
  codigo TEXT,
  estado TEXT,
  pais TEXT,
  municipio TEXT,
  guia_env TEXT,
  fac_env TEXT,
  id_guia TEXT,
  r_evidencia TEXT,
  r_factura TEXT,
  f_entrega TIMESTAMPTZ,
  cve_ped_tiend TEXT,
  paqueteria TEXT,
  reg_fisc TEXT,
  cve_pais_sat TEXT,
  feeddocument_guia TEXT
);

ALTER TABLE infenvio03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: intcoi03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS intcoi03 CASCADE;

CREATE TABLE intcoi03 (
  cve_intcoi INTEGER,
  transaccio INTEGER,
  tipopol TEXT,
  numpol TEXT,
  fechapol TIMESTAMPTZ,
  fechaopr TIMESTAMPTZ,
  sistema TEXT,
  numusr INTEGER,
  operacion INTEGER,
  status INTEGER,
  tippolint TEXT,
  polmodelo TEXT,
  ctlpol INTEGER,
  statuscli TEXT
);

ALTER TABLE intcoi03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: inve03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS inve03 CASCADE;

CREATE TABLE inve03 (
  cve_art TEXT,
  descr TEXT,
  lin_prod TEXT,
  con_serie TEXT,
  uni_med TEXT,
  uni_emp DOUBLE PRECISION,
  ctrl_alm TEXT,
  tiem_surt INTEGER,
  stock_min DOUBLE PRECISION,
  stock_max DOUBLE PRECISION,
  tip_costeo TEXT,
  num_mon INTEGER,
  fch_ultcom TIMESTAMPTZ,
  comp_x_rec DOUBLE PRECISION,
  fch_ultvta TIMESTAMPTZ,
  pend_surt DOUBLE PRECISION,
  exist DOUBLE PRECISION,
  costo_prom DOUBLE PRECISION,
  ult_costo DOUBLE PRECISION,
  cve_obs INTEGER,
  tipo_ele TEXT,
  uni_alt TEXT,
  fac_conv DOUBLE PRECISION,
  apart DOUBLE PRECISION,
  con_lote TEXT,
  con_pedimento TEXT,
  peso DOUBLE PRECISION,
  volumen DOUBLE PRECISION,
  cve_esqimpu INTEGER,
  cve_bita INTEGER,
  vtas_anl_c DOUBLE PRECISION,
  vtas_anl_m DOUBLE PRECISION,
  comp_anl_c DOUBLE PRECISION,
  comp_anl_m DOUBLE PRECISION,
  prefijo TEXT,
  talla TEXT,
  color TEXT,
  cuent_cont TEXT,
  cve_imagen TEXT,
  blk_cst_ext TEXT,
  status TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  version_sinc_fecha_img TIMESTAMPTZ,
  cve_prodserv TEXT,
  cve_unidad TEXT,
  mat_peli TEXT,
  titulo_ml TEXT,
  id_catalogo TEXT,
  en_catalogo TEXT,
  imagen_ml TEXT,
  f_crea_ml TIMESTAMPTZ,
  last_update_ml TEXT,
  cve_cate_ml TEXT,
  disponible_publ TEXT,
  campos_categ_ml TEXT,
  categ_ml TEXT,
  envio_ml TEXT,
  largo_ml DOUBLE PRECISION,
  edo_publ_ml TEXT,
  condicion_ml TEXT,
  tipo_publ_ml TEXT,
  modo_envio_ml TEXT,
  cve_publ_ml TEXT,
  alto_ml DOUBLE PRECISION,
  ancho_ml DOUBLE PRECISION,
  desc_especifica TEXT,
  coi_sinc TIMESTAMPTZ,
  fac_unid_cce DOUBLE PRECISION,
  uni_aduana TEXT,
  fracc_aranc TEXT
);

ALTER TABLE inve03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: inven_claro03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS inven_claro03 CASCADE;

CREATE TABLE inven_claro03 (
  cve_art TEXT,
  cve_publ_cs TEXT,
  edo_publ_cs TEXT,
  edo_prod_cs TEXT,
  desc_cs TEXT,
  sku_cs TEXT,
  ean_cs TEXT,
  categ_cs TEXT,
  cve_cate_cs TEXT,
  marca_cs TEXT,
  tiemp_embarq INTEGER,
  largo_cs DOUBLE PRECISION,
  alto_cs DOUBLE PRECISION,
  ancho_cs DOUBLE PRECISION,
  last_update_cs TIMESTAMPTZ,
  imagen_cs TEXT,
  disp_publ_cs TEXT,
  f_crea_cs TIMESTAMPTZ,
  fulfillment TEXT,
  descr_esp TEXT
);

ALTER TABLE inven_claro03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: inve_amazon03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS inve_amazon03 CASCADE;

CREATE TABLE inve_amazon03 (
  cve_art TEXT,
  asin TEXT,
  sku_am TEXT,
  edo_publ_am TEXT,
  condicion TEXT,
  mod_envio TEXT,
  status TEXT,
  submit_id TEXT,
  titulopub_am TEXT,
  titulo_am TEXT,
  fabricante_am TEXT,
  marca_am TEXT,
  tipo_prod_am TEXT,
  descr_am TEXT,
  atributos_am TEXT,
  carac_am TEXT,
  disp_publ_am TEXT,
  f_pub_am TIMESTAMPTZ,
  disp_oferta TEXT,
  f_des_of TIMESTAMPTZ,
  f_has_of TIMESTAMPTZ,
  status_inv TEXT,
  submit_inv_id TEXT,
  status_pre TEXT,
  submit_pre_id TEXT,
  status_elim TEXT,
  submit_elim_id TEXT,
  feeddocument_elim TEXT,
  feeddocument_pre TEXT,
  feeddocument_inv TEXT,
  feeddocument TEXT
);

ALTER TABLE inve_amazon03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: inve_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS inve_clib03 CASCADE;

CREATE TABLE inve_clib03 (
  cve_prod TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 INTEGER,
  camplib5 DOUBLE PRECISION,
  camplib6 DOUBLE PRECISION,
  camplib7 DOUBLE PRECISION,
  camplib8 DOUBLE PRECISION,
  camplib9 TEXT,
  camplib10 TEXT,
  camplib11 TEXT
);

ALTER TABLE inve_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: inve_meli03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS inve_meli03 CASCADE;

CREATE TABLE inve_meli03 (
  cve_art TEXT,
  descr_ml TEXT
);

ALTER TABLE inve_meli03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: invfis03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS invfis03 CASCADE;

CREATE TABLE invfis03 (
  cve_art TEXT,
  cve_alm INTEGER,
  existcong DOUBLE PRECISION,
  secapturo INTEGER,
  existreal DOUBLE PRECISION
);

ALTER TABLE invfis03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: kits03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS kits03 CASCADE;

CREATE TABLE kits03 (
  cve_art TEXT,
  cve_prod TEXT,
  porcen DOUBLE PRECISION,
  cantidad DOUBLE PRECISION
);

ALTER TABLE kits03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: listprodsust03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS listprodsust03 CASCADE;

CREATE TABLE listprodsust03 (
  cve_lista INTEGER,
  descripcion TEXT
);

ALTER TABLE listprodsust03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: lnkolkc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS lnkolkc03 CASCADE;

CREATE TABLE lnkolkc03 (
  ncontacto INTEGER,
  usuariosae INTEGER,
  id_outlook TEXT,
  nombre_usuariosae TEXT
);

ALTER TABLE lnkolkc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: lnkolkp03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS lnkolkp03 CASCADE;

CREATE TABLE lnkolkp03 (
  ncontacto INTEGER,
  id_outlook TEXT,
  usuariosae INTEGER,
  nombre_usuariosae TEXT
);

ALTER TABLE lnkolkp03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ltpd03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ltpd03 CASCADE;

CREATE TABLE ltpd03 (
  cve_art TEXT,
  lote TEXT,
  pedimento TEXT,
  cve_alm INTEGER,
  fchcaduc TIMESTAMPTZ,
  fchaduana TIMESTAMPTZ,
  fchultmov TIMESTAMPTZ,
  nom_aduan TEXT,
  cantidad DOUBLE PRECISION,
  reg_ltpd INTEGER,
  cve_obs INTEGER,
  ciudad TEXT,
  frontera TEXT,
  fec_prod_lt TIMESTAMPTZ,
  gln TEXT,
  status TEXT,
  pedimentosat TEXT
);

ALTER TABLE ltpd03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: minve03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS minve03 CASCADE;

CREATE TABLE minve03 (
  cve_art TEXT,
  almacen INTEGER,
  num_mov INTEGER,
  cve_cpto INTEGER,
  fecha_docu TIMESTAMPTZ,
  tipo_doc TEXT,
  refer TEXT,
  clave_clpv TEXT,
  vend TEXT,
  cant DOUBLE PRECISION,
  cant_cost DOUBLE PRECISION,
  precio DOUBLE PRECISION,
  costo DOUBLE PRECISION,
  afec_coi TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  uni_venta TEXT,
  e_ltpd INTEGER,
  exist_g DOUBLE PRECISION,
  existencia DOUBLE PRECISION,
  tipo_prod TEXT,
  factor_con DOUBLE PRECISION,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  cve_folio TEXT,
  signo INTEGER,
  costeado TEXT,
  costo_prom_ini DOUBLE PRECISION,
  costo_prom_fin DOUBLE PRECISION,
  costo_prom_gral DOUBLE PRECISION,
  desde_inve TEXT,
  mov_enlazado INTEGER,
  ctlcoi INTEGER
);

ALTER TABLE minve03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: moned03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS moned03 CASCADE;

CREATE TABLE moned03 (
  num_moned INTEGER,
  descr TEXT,
  simbolo TEXT,
  tcambio DOUBLE PRECISION,
  fultcamb TIMESTAMPTZ,
  status TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  cve_moned TEXT
);

ALTER TABLE moned03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: mult03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS mult03 CASCADE;

CREATE TABLE mult03 (
  cve_art TEXT,
  cve_alm INTEGER,
  status TEXT,
  ctrl_alm TEXT,
  exist DOUBLE PRECISION,
  stock_min DOUBLE PRECISION,
  stock_max DOUBLE PRECISION,
  comp_x_rec DOUBLE PRECISION,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  pend_surt DOUBLE PRECISION
);

ALTER TABLE mult03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: numser03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS numser03 CASCADE;

CREATE TABLE numser03 (
  cve_art TEXT,
  num_ser TEXT,
  status TEXT,
  almacen INTEGER,
  costo DOUBLE PRECISION,
  docto_ent TEXT,
  fecha_ent TIMESTAMPTZ
);

ALTER TABLE numser03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: obs_docc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS obs_docc03 CASCADE;

CREATE TABLE obs_docc03 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE obs_docc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: obs_docf03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS obs_docf03 CASCADE;

CREATE TABLE obs_docf03 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE obs_docf03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ocli03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ocli03 CASCADE;

CREATE TABLE ocli03 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE ocli03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ocuen03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ocuen03 CASCADE;

CREATE TABLE ocuen03 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE ocuen03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: oinve03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oinve03 CASCADE;

CREATE TABLE oinve03 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE oinve03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: oltpd03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oltpd03 CASCADE;

CREATE TABLE oltpd03 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE oltpd03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ominve03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ominve03 CASCADE;

CREATE TABLE ominve03 (
  str_obs TEXT,
  cve_obs INTEGER
);

ALTER TABLE ominve03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: opaga03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS opaga03 CASCADE;

CREATE TABLE opaga03 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE opaga03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: operador03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS operador03 CASCADE;

CREATE TABLE operador03 (
  cve_ope TEXT,
  nom_ope TEXT,
  xml_ope TEXT,
  tipo_fig TEXT
);

ALTER TABLE operador03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: oper_terceros03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oper_terceros03 CASCADE;

CREATE TABLE oper_terceros03 (
  tipo INTEGER,
  descr TEXT
);

ALTER TABLE oper_terceros03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: oper_x_tipo_tercero03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oper_x_tipo_tercero03 CASCADE;

CREATE TABLE oper_x_tipo_tercero03 (
  tip_tercero INTEGER,
  operacion INTEGER
);

ALTER TABLE oper_x_tipo_tercero03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: oprov03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS oprov03 CASCADE;

CREATE TABLE oprov03 (
  cve_obs INTEGER,
  str_obs TEXT
);

ALTER TABLE oprov03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: paga_det03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS paga_det03 CASCADE;

CREATE TABLE paga_det03 (
  cve_prov TEXT,
  refer TEXT,
  num_cpto INTEGER,
  num_cargo INTEGER,
  id_mov INTEGER,
  cve_folio TEXT,
  cve_obs INTEGER,
  no_factura TEXT,
  docto TEXT,
  importe DOUBLE PRECISION,
  fecha_apli TIMESTAMPTZ,
  fecha_venc TIMESTAMPTZ,
  afec_coi TEXT,
  num_moned INTEGER,
  tcambio DOUBLE PRECISION,
  impmon_ext DOUBLE PRECISION,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  cve_bita INTEGER,
  tipo_mov TEXT,
  signo INTEGER,
  cve_aut INTEGER,
  usuario INTEGER,
  ref_sist TEXT,
  no_partida INTEGER,
  refbanco_origen TEXT,
  refbanco_dest TEXT,
  numctapago_origen TEXT,
  numctapago_destino TEXT,
  numcheque TEXT,
  beneficiario TEXT,
  cve_externa TEXT,
  cve_doc_comppago TEXT,
  cta_banca_ordenante TEXT,
  ctlcoi INTEGER
);

ALTER TABLE paga_det03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: paga_m03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS paga_m03 CASCADE;

CREATE TABLE paga_m03 (
  cve_prov TEXT,
  refer TEXT,
  num_cargo INTEGER,
  num_cpto INTEGER,
  cve_folio TEXT,
  cve_obs INTEGER,
  no_factura TEXT,
  docto TEXT,
  importe DOUBLE PRECISION,
  fecha_apli TIMESTAMPTZ,
  fecha_venc TIMESTAMPTZ,
  afec_coi TEXT,
  num_moned INTEGER,
  tcambio DOUBLE PRECISION,
  impmon_ext DOUBLE PRECISION,
  fechaelab TIMESTAMPTZ,
  ctlpol INTEGER,
  tipo_mov TEXT,
  cve_bita INTEGER,
  signo INTEGER,
  cve_aut INTEGER,
  usuario INTEGER,
  entregada TEXT,
  fecha_entrega TIMESTAMPTZ,
  ref_sist TEXT,
  status TEXT,
  ctlcoi INTEGER
);

ALTER TABLE paga_m03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: pagocodi03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS pagocodi03 CASCADE;

CREATE TABLE pagocodi03 (
  idmensaje TEXT,
  numcli TEXT,
  cve_clie TEXT,
  refer TEXT,
  id_mov INTEGER,
  num_cpto INTEGER,
  num_cargo INTEGER,
  estado INTEGER,
  metodo TEXT,
  monto DOUBLE PRECISION,
  folio TEXT,
  usado TEXT,
  fecha TIMESTAMPTZ,
  fecha_modificacion TIMESTAMPTZ
);

ALTER TABLE pagocodi03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: pagolinea03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS pagolinea03 CASCADE;

CREATE TABLE pagolinea03 (
  id_operacion TEXT,
  id_clientran INTEGER,
  autoriza INTEGER,
  tarjeta TEXT,
  tip_doc TEXT,
  fecha_oper TIMESTAMPTZ,
  estatus TEXT,
  tip_oper TEXT,
  aplicado TEXT,
  refer TEXT,
  monto DOUBLE PRECISION,
  num_cpto INTEGER,
  proveedor TEXT,
  xml_pl TEXT
);

ALTER TABLE pagolinea03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: pagos_ped_tienda03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS pagos_ped_tienda03 CASCADE;

CREATE TABLE pagos_ped_tienda03 (
  cve_doc TEXT,
  cve_pago TEXT,
  num_par INTEGER,
  edo_pago TEXT,
  det_edo TEXT,
  f_creacion TIMESTAMPTZ,
  f_aprob TIMESTAMPTZ,
  tipo_pago TEXT,
  moneda TEXT,
  importe DOUBLE PRECISION
);

ALTER TABLE pagos_ped_tienda03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: pais03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS pais03 CASCADE;

CREATE TABLE pais03 (
  cve_pais TEXT,
  descr TEXT
);

ALTER TABLE pais03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_aplicasoc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_aplicasoc03 CASCADE;

CREATE TABLE param_aplicasoc03 (
  num_emp INTEGER,
  execalculadora TEXT,
  exeeditortextos TEXT,
  exehojacalculo TEXT,
  activarsugerencia TEXT,
  activarmodoaltcaptura TEXT,
  impresora TEXT
);

ALTER TABLE param_aplicasoc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_camposlibres03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_camposlibres03 CASCADE;

CREATE TABLE param_camposlibres03 (
  num_emp INTEGER,
  idtabla TEXT,
  campo TEXT,
  etiqueta TEXT
);

ALTER TABLE param_camposlibres03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_clientes03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_clientes03 CASCADE;

CREATE TABLE param_clientes03 (
  num_emp INTEGER,
  diascredito INTEGER,
  clavesecuencial TEXT,
  cxcopintegrado TEXT,
  tipoagrupadoctos INTEGER,
  gananciacambiaria INTEGER,
  perdidacambiaria INTEGER,
  manejofolio TEXT,
  folio TEXT,
  fechalimdemov TIMESTAMPTZ,
  vercitasinicio TEXT,
  ajustecargo INTEGER,
  ajusteabono INTEGER
);

ALTER TABLE param_clientes03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_codi03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_codi03 CASCADE;

CREATE TABLE param_codi03 (
  num_emp INTEGER,
  alias_cert TEXT,
  config_codi TEXT,
  dig_verif TEXT,
  cert_codi TEXT,
  cuenta_benef TEXT,
  cve_banco TEXT,
  keysource TEXT,
  cve_acceso_cert TEXT,
  private_key TEXT,
  sellocert_arch TEXT,
  selloprivkey_arch TEXT,
  contrasenia TEXT,
  keyoriginal TEXT,
  codi_nombrevend TEXT
);

ALTER TABLE param_codi03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_compras03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_compras03 CASCADE;

CREATE TABLE param_compras03 (
  num_emp INTEGER,
  acumcompvtasenlinea TEXT,
  altaclieprovencaptura TEXT,
  altaprodencaptura TEXT,
  numcptocompvtasplazos INTEGER,
  numcptointxcompvtaplazo INTEGER,
  numcptoretclieprov INTEGER,
  numimpuesto INTEGER,
  manejoflete TEXT,
  montoflete DOUBLE PRECISION,
  impflete DOUBLE PRECISION,
  fchcierredoctos TIMESTAMPTZ,
  acumularindcxp INTEGER,
  modulo TEXT,
  modificaralmacen TEXT,
  registropagoscomp TEXT,
  polizasenlineacomp TEXT,
  polizasenlineacompdevol TEXT,
  polizaagrupcomp INTEGER,
  polizaagrupcompdevol INTEGER
);

ALTER TABLE param_compras03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_ctacontable03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_ctacontable03 CASCADE;

CREATE TABLE param_ctacontable03 (
  num_emp INTEGER,
  ventas TEXT,
  descfinanvtas TEXT,
  impxpagar TEXT,
  devolventas TEXT,
  ventaservicios TEXT,
  clientes TEXT,
  almacen TEXT,
  descfinancomp TEXT,
  impxacreditar TEXT,
  devolcompras TEXT,
  compraservicios TEXT,
  proveedores TEXT,
  bancos TEXT,
  otrosimpuestos TEXT,
  impuestoventa1 TEXT,
  impuestoventa2 TEXT,
  impuestoventa3 TEXT,
  difcostocompra TEXT,
  notascred TEXT
);

ALTER TABLE param_ctacontable03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_datosbancarios03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_datosbancarios03 CASCADE;

CREATE TABLE param_datosbancarios03 (
  num_emp INTEGER,
  banco TEXT,
  rfc TEXT,
  cuenta TEXT
);

ALTER TABLE param_datosbancarios03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_datosbd03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_datosbd03 CASCADE;

CREATE TABLE param_datosbd03 (
  num_emp INTEGER,
  rutadatos TEXT,
  driver TEXT,
  usuario TEXT,
  rutatrabajo TEXT,
  versionbd TEXT
);

ALTER TABLE param_datosbd03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_datosemp03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_datosemp03 CASCADE;

CREATE TABLE param_datosemp03 (
  num_emp INTEGER,
  nombre_empresa TEXT,
  direccion TEXT,
  poblacion TEXT,
  rfc TEXT,
  reg_estatal TEXT,
  logo_empresa TEXT,
  asignavalpredcveprodsat TEXT,
  valpredcveproductosat TEXT,
  asignavalpredunimedsat TEXT,
  valpredunimedprodsat TEXT,
  clie_factglobal TEXT
);

ALTER TABLE param_datosemp03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_datosgrales03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_datosgrales03 CASCADE;

CREATE TABLE param_datosgrales03 (
  num_emp INTEGER,
  redon_montos TEXT,
  redon_costos TEXT,
  charcompdos TEXT,
  pol_desc TEXT,
  cxccliemostr TEXT,
  multimoneda TEXT,
  valenlinea TEXT,
  solicitatipocambio TEXT,
  mostrarimagconsulta TEXT,
  esqimpuesto INTEGER,
  desccomercial DOUBLE PRECISION,
  cajoninstalado TEXT,
  puertocajon TEXT,
  secapertura TEXT,
  secinicio TEXT,
  secconfirma TEXT,
  monedapred INTEGER,
  impglobal DOUBLE PRECISION,
  tipocambio DOUBLE PRECISION,
  numempcoi INTEGER,
  conintoutlook TEXT,
  numdec_enmontos INTEGER,
  pagoporinternet TEXT,
  regsxdemanda TEXT,
  tampaquete INTEGER,
  bitacora_clientes TEXT,
  bitacora_facturas TEXT,
  bitacora_inventario TEXT,
  bitacora_proveedor TEXT,
  bitacora_compras TEXT,
  noservpagoxinter TEXT,
  bitacora_utilerias TEXT,
  bitacora_estadisticas TEXT,
  bitacora_configsistema TEXT,
  rutareportes TEXT,
  numdec_encostoyprecio INTEGER,
  numdec_porcentajes INTEGER,
  correoservidor TEXT,
  correopuerto INTEGER,
  correousuario TEXT,
  correocontrasenia TEXT,
  correoconseg TEXT,
  correoauten TEXT,
  correoproveedor INTEGER,
  desgloseimp1 TEXT,
  desgloseimp2 TEXT,
  desgloseimp3 TEXT,
  desgloseimp4 TEXT,
  refbanco TEXT,
  numctapago TEXT,
  versionreestructurada INTEGER,
  lat_general DOUBLE PRECISION,
  lon_general DOUBLE PRECISION,
  lat_envio DOUBLE PRECISION,
  lon_envio DOUBLE PRECISION,
  tiempoaire TEXT,
  bitacora_tiendas TEXT,
  numimpgeneral INTEGER,
  desgloseimp8 TEXT,
  desgloseimp7 TEXT,
  desgloseimp6 TEXT,
  desgloseimp5 TEXT,
  correoremitente TEXT,
  sucursales TEXT
);

ALTER TABLE param_datosgrales03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_domexped03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_domexped03 CASCADE;

CREATE TABLE param_domexped03 (
  num_emp INTEGER,
  calle TEXT,
  numero_ext TEXT,
  numero_int TEXT,
  colonia TEXT,
  localidad TEXT,
  referencia TEXT,
  municipio TEXT,
  estado TEXT,
  pais TEXT,
  cp TEXT,
  cruzamiento1 TEXT,
  cruzamiento2 TEXT,
  lugardeexped TEXT,
  zonahorariacp INTEGER,
  zonahorariabase INTEGER
);

ALTER TABLE param_domexped03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_domfiscal03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_domfiscal03 CASCADE;

CREATE TABLE param_domfiscal03 (
  num_emp INTEGER,
  calle TEXT,
  numero_ext TEXT,
  numero_int TEXT,
  colonia TEXT,
  localidad TEXT,
  referencia TEXT,
  municipio TEXT,
  estado TEXT,
  pais TEXT,
  cp TEXT,
  cruzamiento1 TEXT,
  cruzamiento2 TEXT,
  lugardeexped TEXT
);

ALTER TABLE param_domfiscal03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_factura03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_factura03 CASCADE;

CREATE TABLE param_factura03 (
  num_emp INTEGER,
  facturasinexist TEXT,
  altaclieprovencaptura TEXT,
  acumcompvtasenlinea TEXT,
  muestradesgkits TEXT,
  vendcvesec TEXT,
  noafecdoctoxclie TEXT,
  altanumserieenventas TEXT,
  facturarlotpedsinexist TEXT,
  permitirvtaprodcaducos TEXT,
  polizasenlineavtas TEXT,
  polizasenlineadevol TEXT,
  numdescuentos INTEGER,
  numimpuesto INTEGER,
  numcptocompvtasplazos INTEGER,
  numcptointxcompvtaplazo INTEGER,
  numcptoretclieprov INTEGER,
  nummaxpart INTEGER,
  manejoflete TEXT,
  montoflete DOUBLE PRECISION,
  impflete DOUBLE PRECISION,
  fchcierredoctos TIMESTAMPTZ,
  modulo TEXT,
  almacendevolucion INTEGER,
  conalmacendevolucion TEXT,
  almadevper INTEGER,
  modificaralmacen TEXT,
  reformafiscal2012 INTEGER,
  numcptonotavta INTEGER,
  numcptoefectivo INTEGER,
  numcptocambio INTEGER,
  captprimeroprod TEXT,
  almacenfactglob INTEGER,
  polizasenlineanotacred TEXT
);

ALTER TABLE param_factura03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_facturaelectronica03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_facturaelectronica03 CASCADE;

CREATE TABLE param_facturaelectronica03 (
  num_emp INTEGER,
  sellocertif TEXT,
  selloprivkey TEXT,
  cveaccesocert TEXT,
  avisasello INTEGER,
  rfcmostr TEXT,
  rutaaddendaf TEXT,
  rutaaddendad TEXT,
  rutanamespace TEXT,
  desgdesc TEXT,
  versioncomprobantedigital INTEGER,
  tipopacgeneral TEXT,
  usuariopac TEXT,
  passwordpac TEXT,
  proveedorpac TEXT,
  firmacontrato TEXT,
  idsesionpacgral TEXT,
  usuariopac_cancel TEXT,
  passwordpac_cancel TEXT,
  proveedorpac_cancel TEXT,
  notificacancelacionenauto TEXT,
  regimenfiscal TEXT,
  regimenfiscalsat TEXT,
  desplieguekitxml INTEGER,
  sellocertif_arch TEXT,
  selloprivkey_arch TEXT,
  mtomaxfact DOUBLE PRECISION,
  cancelaenformamanual TEXT,
  rutaaddendag TEXT,
  rutaaddendae TEXT,
  rutaaddendat TEXT,
  fielprivkey_arch TEXT,
  fielcertif_arch TEXT,
  avisasellofiel INTEGER,
  cveaccesofiel TEXT,
  fielprivkey TEXT,
  fielcertif TEXT,
  envioauttablero TEXT
);

ALTER TABLE param_facturaelectronica03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_foliosc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_foliosc03 CASCADE;

CREATE TABLE param_foliosc03 (
  num_emp INTEGER,
  numfolio TEXT,
  cvefolio TEXT,
  tipodocto TEXT,
  tipo TEXT,
  serie TEXT,
  folioinicial INTEGER,
  separador TEXT,
  ftoemision TEXT,
  archconfig TEXT,
  mascara TEXT,
  longitud INTEGER
);

ALTER TABLE param_foliosc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_foliosf03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_foliosf03 CASCADE;

CREATE TABLE param_foliosf03 (
  num_emp INTEGER,
  numfolio TEXT,
  cvefolio TEXT,
  tipodocto TEXT,
  tipo TEXT,
  serie TEXT,
  separador TEXT,
  ftoemision TEXT,
  mascara TEXT,
  folioinicial INTEGER,
  foliofinal INTEGER,
  archconfig TEXT,
  longitud INTEGER,
  calle TEXT,
  numeroext TEXT,
  numeroint TEXT,
  colonia TEXT,
  localidad TEXT,
  referencia TEXT,
  municipio TEXT,
  estado TEXT,
  pais TEXT,
  cp TEXT,
  cruzamiento1 TEXT,
  cruzamiento2 TEXT,
  sellocertif TEXT,
  selloprivkey TEXT,
  cveaccesocert TEXT,
  avisasello INTEGER,
  usuariopac TEXT,
  passwordpac TEXT,
  proveedorpac TEXT,
  firmacontrato TEXT,
  idsesionpac TEXT,
  regimenfiscal TEXT,
  regimenfiscalsat TEXT,
  lugardeexpedicion TEXT,
  parcialidad TEXT,
  plantilla TEXT,
  foliopersonalizado TEXT,
  status TEXT,
  sellocertif_arch TEXT,
  selloprivkey_arch TEXT,
  ftoemisioncfdi33 TEXT,
  ubi_emi TEXT,
  cap_com_ext TEXT,
  ftoemisioncfdi40 TEXT,
  zonahorariacp INTEGER,
  zonahorariabase INTEGER,
  emi_ccx TEXT
);

ALTER TABLE param_foliosf03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_graficas03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_graficas03 CASCADE;

CREATE TABLE param_graficas03 (
  num_emp INTEGER,
  ajustvalmax TEXT,
  graficacum TEXT,
  nummaxval INTEGER,
  numsaltos INTEGER,
  copiarascii TEXT,
  copiarlotus TEXT,
  copiarexcel TEXT,
  copiarconencab TEXT,
  copiarcontotales TEXT
);

ALTER TABLE param_graficas03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_inter_coi03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_inter_coi03 CASCADE;

CREATE TABLE param_inter_coi03 (
  user_id_coi TEXT,
  num_emp_sae INTEGER,
  num_emp_coi INTEGER,
  num_serie_coi TEXT,
  rfc_coi TEXT,
  nom_emp_coi TEXT,
  estatus TEXT,
  prox_sincro TEXT,
  tiempo_hora INTEGER,
  hora_x_dia TEXT
);

ALTER TABLE param_inter_coi03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_inventario03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_inventario03 CASCADE;

CREATE TABLE param_inventario03 (
  num_emp INTEGER,
  integrafacturas TEXT,
  integracompras TEXT,
  cambioexistencias TEXT,
  digitoverifica TEXT,
  multialmacen TEXT,
  cveprecminimo INTEGER,
  movtraspasoentrada INTEGER,
  movtraspasosalida INTEGER,
  numdecimales INTEGER,
  gpoprodleyendasecc1 TEXT,
  gpoprodleyendasecc2 TEXT,
  ftomovsinventario TEXT,
  verenaltanumserie TEXT,
  verenaltaloteyped TEXT,
  nombreimp1 TEXT,
  nombreimp2 TEXT,
  nombreimp3 TEXT,
  nombreimp4 TEXT,
  porcentajeimp1 DOUBLE PRECISION,
  porcentajeimp2 DOUBLE PRECISION,
  porcentajeimp3 DOUBLE PRECISION,
  porcentajeimp4 DOUBLE PRECISION,
  almacenpredeter INTEGER,
  invintegrado TEXT,
  modalmacen TEXT,
  fchcierredoctos TIMESTAMPTZ,
  servicioflete TEXT,
  costearxalmacen TEXT,
  prodfactglob TEXT,
  nombreimp1sat TEXT,
  nombreimp2sat TEXT,
  nombreimp3sat TEXT,
  nombreimp4sat TEXT,
  porcentajeresico DOUBLE PRECISION,
  nombreimp5 TEXT,
  nombreimp8sat TEXT,
  tipoimp1 TEXT,
  nivelimp8 TEXT,
  nivelimp7 TEXT,
  nivelimp6 TEXT,
  nivelimp5 TEXT,
  nivelimp4 TEXT,
  nivelimp3 TEXT,
  nivelimp2 TEXT,
  nivelimp1 TEXT,
  tipoimp2 TEXT,
  nombreimp7sat TEXT,
  nombreimp6sat TEXT,
  nombreimp5sat TEXT,
  porcentajeimp8 DOUBLE PRECISION,
  porcentajeimp7 DOUBLE PRECISION,
  porcentajeimp6 DOUBLE PRECISION,
  porcentajeimp5 DOUBLE PRECISION,
  nombreimp8 TEXT,
  nombreimp7 TEXT,
  nombreimp6 TEXT,
  tipoimp3 TEXT,
  tipoimp8 TEXT,
  tipoimp7 TEXT,
  tipoimp6 TEXT,
  tipoimp5 TEXT,
  tipoimp4 TEXT
);

ALTER TABLE param_inventario03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_partidascomp03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_partidascomp03 CASCADE;

CREATE TABLE param_partidascomp03 (
  num_emp INTEGER,
  capenaltadoctoobs TEXT,
  capenaltadoctoimp TEXT,
  capalmacenxpartidas TEXT,
  verencstanumserie TEXT,
  verencstaloteped TEXT,
  verencstaobs TEXT,
  verencstadsglsgpoprod TEXT,
  verencapnumserie TEXT,
  verencaploteped TEXT,
  verencapobs TEXT,
  consideraimp1encosto TEXT,
  indporpartida TEXT
);

ALTER TABLE param_partidascomp03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_partidasfact03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_partidasfact03 CASCADE;

CREATE TABLE param_partidasfact03 (
  num_emp INTEGER,
  capenaltadoctodescto TEXT,
  capenaltadoctoimp TEXT,
  capenaltadoctocomision TEXT,
  capalmacenxpartidas TEXT,
  capenaltadoctoobs TEXT,
  verencstatipoprod TEXT,
  verencstanumserie TEXT,
  verencstaloteped TEXT,
  verencstaobs TEXT,
  verencstaapartados TEXT,
  verencstadsglsgpoprod TEXT,
  verencaptipoprod TEXT,
  verencapnumserie TEXT,
  verencaploteped TEXT,
  verencapobs TEXT,
  verencapapartados TEXT,
  verencapdescrprod TEXT,
  verencapcostoprod TEXT,
  verencapclvesat TEXT,
  verencappreccimp TEXT
);

ALTER TABLE param_partidasfact03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_proveedores03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_proveedores03 CASCADE;

CREATE TABLE param_proveedores03 (
  num_emp INTEGER,
  clavesecuencial TEXT,
  cxcopintegrado TEXT,
  tipoagrupadoctos INTEGER,
  gananciacambiaria INTEGER,
  perdidacambiaria INTEGER,
  manejofolio TEXT,
  folio TEXT,
  fechalimdemov TIMESTAMPTZ,
  ajustecargo INTEGER,
  ajusteabono INTEGER
);

ALTER TABLE param_proveedores03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_tiendas03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_tiendas03 CASCADE;

CREATE TABLE param_tiendas03 (
  id_usuario INTEGER,
  num_emp INTEGER,
  cve_tienda TEXT,
  id_user_tiend TEXT,
  iniciar_auto TEXT,
  expiracion_token TIMESTAMPTZ,
  refresh_token TEXT,
  acces_token TEXT,
  cve_pv_cs TEXT,
  param_default TEXT,
  cve_alm INTEGER,
  lista_prec INTEGER,
  lista_prec_ofer INTEGER,
  serie TEXT,
  modo_exist TEXT,
  cve_clie TEXT
);

ALTER TABLE param_tiendas03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_tipodoctosc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_tipodoctosc03 CASCADE;

CREATE TABLE param_tipodoctosc03 (
  num_emp INTEGER,
  modulo TEXT,
  tipodocto TEXT,
  foliosecuencial TEXT,
  archconfignosec TEXT,
  ftoemisionnosec TEXT,
  archplantillacorreo TEXT,
  manejarvigenciacotiz TEXT,
  diasvigenciacotiz INTEGER,
  idxftofolioconfig INTEGER,
  seriedefault TEXT
);

ALTER TABLE param_tipodoctosc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: param_tipodoctosf03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS param_tipodoctosf03 CASCADE;

CREATE TABLE param_tipodoctosf03 (
  num_emp INTEGER,
  modulo TEXT,
  tipodocto TEXT,
  foliosecuencial TEXT,
  archconfignosec TEXT,
  ftoemisionnosec TEXT,
  archplantillacorreo TEXT,
  manejarvigenciacotiz TEXT,
  diasvigenciacotiz INTEGER,
  idxftofolioconfig INTEGER,
  seriedefault TEXT
);

ALTER TABLE param_tipodoctosf03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compc03 CASCADE;

CREATE TABLE par_compc03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxr DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  descu DOUBLE PRECISION,
  act_inv TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_elem TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  factconv DOUBLE PRECISION,
  cost_dev DOUBLE PRECISION,
  num_alm INTEGER,
  mindirecto DOUBLE PRECISION,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_compc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compc_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compc_clib03 CASCADE;

CREATE TABLE par_compc_clib03 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_compc_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compd03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compd03 CASCADE;

CREATE TABLE par_compd03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxr DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  descu DOUBLE PRECISION,
  act_inv TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_elem TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  factconv DOUBLE PRECISION,
  cost_dev DOUBLE PRECISION,
  num_alm INTEGER,
  mindirecto DOUBLE PRECISION,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  imp8apla INTEGER,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_compd03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compd_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compd_clib03 CASCADE;

CREATE TABLE par_compd_clib03 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_compd_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compo03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compo03 CASCADE;

CREATE TABLE par_compo03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxr DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  descu DOUBLE PRECISION,
  act_inv TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_elem TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  e_ltpd INTEGER,
  reg_serie INTEGER,
  factconv DOUBLE PRECISION,
  cost_dev DOUBLE PRECISION,
  num_alm INTEGER,
  mindirecto DOUBLE PRECISION,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  totimp6 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_compo03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compo_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compo_clib03 CASCADE;

CREATE TABLE par_compo_clib03 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_compo_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compq03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compq03 CASCADE;

CREATE TABLE par_compq03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxr DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  descu DOUBLE PRECISION,
  act_inv TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_elem TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  factconv DOUBLE PRECISION,
  cost_dev DOUBLE PRECISION,
  num_alm INTEGER,
  mindirecto DOUBLE PRECISION,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  imp6apla INTEGER,
  imp7apla INTEGER,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_compq03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compq_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compq_clib03 CASCADE;

CREATE TABLE par_compq_clib03 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_compq_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compr03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compr03 CASCADE;

CREATE TABLE par_compr03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxr DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  descu DOUBLE PRECISION,
  act_inv TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_elem TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  factconv DOUBLE PRECISION,
  cost_dev DOUBLE PRECISION,
  num_alm INTEGER,
  mindirecto DOUBLE PRECISION,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  imp8apla INTEGER,
  totimp5 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_compr03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_compr_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_compr_clib03 CASCADE;

CREATE TABLE par_compr_clib03 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_compr_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_facta03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_facta03 CASCADE;

CREATE TABLE par_facta03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  impu8 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_facta03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_facta_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_facta_clib03 CASCADE;

CREATE TABLE par_facta_clib03 (
  clave_doc TEXT,
  num_part INTEGER,
  camplib1 TEXT
);

ALTER TABLE par_facta_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factc03 CASCADE;

CREATE TABLE par_factc03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factc_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factc_clib03 CASCADE;

CREATE TABLE par_factc_clib03 (
  clave_doc TEXT,
  num_part INTEGER,
  camplib1 TEXT
);

ALTER TABLE par_factc_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factd03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factd03 CASCADE;

CREATE TABLE par_factd03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  prec_neto DOUBLE PRECISION,
  id_relacion TEXT,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  imp6apla INTEGER,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factd03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factd_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factd_clib03 CASCADE;

CREATE TABLE par_factd_clib03 (
  clave_doc TEXT,
  num_part INTEGER,
  camplib1 TEXT
);

ALTER TABLE par_factd_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_facte03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_facte03 CASCADE;

CREATE TABLE par_facte03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  totimp8 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_facte03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_facte_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_facte_clib03 CASCADE;

CREATE TABLE par_facte_clib03 (
  clave_doc TEXT,
  num_part INTEGER,
  camplib1 TEXT
);

ALTER TABLE par_facte_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factf03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factf03 CASCADE;

CREATE TABLE par_factf03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu8 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  imp5apla INTEGER,
  imp6apla INTEGER,
  totimp5 DOUBLE PRECISION,
  imp7apla INTEGER,
  imp8apla INTEGER,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factf03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factf_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factf_clib03 CASCADE;

CREATE TABLE par_factf_clib03 (
  clave_doc TEXT,
  num_part INTEGER,
  camplib1 TEXT
);

ALTER TABLE par_factf_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factg03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factg03 CASCADE;

CREATE TABLE par_factg03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  impu5 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factg03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factg_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factg_clib03 CASCADE;

CREATE TABLE par_factg_clib03 (
  clave_doc TEXT,
  num_part INTEGER
);

ALTER TABLE par_factg_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factp03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factp03 CASCADE;

CREATE TABLE par_factp03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  prec_neto DOUBLE PRECISION,
  id_relacion TEXT,
  cve_prodserv TEXT,
  cve_unidad TEXT,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  imp6apla INTEGER,
  imp7apla INTEGER,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factp03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factp_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factp_clib03 CASCADE;

CREATE TABLE par_factp_clib03 (
  clave_doc TEXT,
  num_part INTEGER,
  camplib1 TEXT
);

ALTER TABLE par_factp_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factr03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factr03 CASCADE;

CREATE TABLE par_factr03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_prodserv TEXT,
  cve_unidad TEXT,
  imp8apla INTEGER,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factr03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factr_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factr_clib03 CASCADE;

CREATE TABLE par_factr_clib03 (
  clave_doc TEXT,
  num_part INTEGER,
  camplib1 TEXT
);

ALTER TABLE par_factr_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factt03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factt03 CASCADE;

CREATE TABLE par_factt03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  prec_neto DOUBLE PRECISION,
  id_relacion TEXT,
  cve_unidad TEXT,
  cve_prodserv TEXT,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp7apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factt03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factt_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factt_clib03 CASCADE;

CREATE TABLE par_factt_clib03 (
  clave_doc TEXT,
  num_part INTEGER,
  camplib1 TEXT
);

ALTER TABLE par_factt_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factv03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factv03 CASCADE;

CREATE TABLE par_factv03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cant DOUBLE PRECISION,
  pxs DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cost DOUBLE PRECISION,
  impu1 DOUBLE PRECISION,
  impu2 DOUBLE PRECISION,
  impu3 DOUBLE PRECISION,
  impu4 DOUBLE PRECISION,
  imp1apla INTEGER,
  imp2apla INTEGER,
  imp3apla INTEGER,
  imp4apla INTEGER,
  totimp1 DOUBLE PRECISION,
  totimp2 DOUBLE PRECISION,
  totimp3 DOUBLE PRECISION,
  totimp4 DOUBLE PRECISION,
  desc1 DOUBLE PRECISION,
  desc2 DOUBLE PRECISION,
  desc3 DOUBLE PRECISION,
  comi DOUBLE PRECISION,
  apar DOUBLE PRECISION,
  act_inv TEXT,
  num_alm INTEGER,
  polit_apli TEXT,
  tip_cam DOUBLE PRECISION,
  uni_venta TEXT,
  tipo_prod TEXT,
  cve_obs INTEGER,
  reg_serie INTEGER,
  e_ltpd INTEGER,
  tipo_elem TEXT,
  num_mov INTEGER,
  tot_partida DOUBLE PRECISION,
  imprimir TEXT,
  man_ieps TEXT,
  apl_man_imp INTEGER,
  cuota_ieps DOUBLE PRECISION,
  apl_man_ieps TEXT,
  mto_porc DOUBLE PRECISION,
  mto_cuota DOUBLE PRECISION,
  cve_esq INTEGER,
  descr_art TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  id_relacion TEXT,
  prec_neto DOUBLE PRECISION,
  cve_prodserv TEXT,
  cve_unidad TEXT,
  totimp8 DOUBLE PRECISION,
  totimp7 DOUBLE PRECISION,
  totimp6 DOUBLE PRECISION,
  totimp5 DOUBLE PRECISION,
  imp8apla INTEGER,
  imp6apla INTEGER,
  imp5apla INTEGER,
  impu8 DOUBLE PRECISION,
  impu7 DOUBLE PRECISION,
  impu6 DOUBLE PRECISION,
  impu5 DOUBLE PRECISION,
  imp7apla INTEGER,
  preccimp DOUBLE PRECISION
);

ALTER TABLE par_factv03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_factv_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_factv_clib03 CASCADE;

CREATE TABLE par_factv_clib03 (
  clave_doc TEXT,
  num_part INTEGER,
  camplib1 TEXT
);

ALTER TABLE par_factv_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_ped_amazon03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_ped_amazon03 CASCADE;

CREATE TABLE par_ped_amazon03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_par TEXT,
  asin TEXT,
  sku_am TEXT,
  titulo TEXT,
  cant INTEGER,
  cant_enviada INTEGER,
  prec DOUBLE PRECISION,
  cve_moned TEXT,
  cve_moned_env TEXT,
  cost_envio DOUBLE PRECISION,
  es_regalo TEXT,
  msg_regalo TEXT,
  cve_moned_rega TEXT,
  cost_regalo DOUBLE PRECISION,
  tipo_envoltura TEXT,
  cve_moned_descu TEXT,
  descuento DOUBLE PRECISION,
  tot_partida DOUBLE PRECISION
);

ALTER TABLE par_ped_amazon03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_ped_claro03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_ped_claro03 CASCADE;

CREATE TABLE par_ped_claro03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  claro_id TEXT,
  titulo_art TEXT,
  asignado TEXT,
  id_ped_rel TEXT,
  importe DOUBLE PRECISION,
  cst_envio DOUBLE PRECISION,
  f_asigna TIMESTAMPTZ,
  f_envio TIMESTAMPTZ
);

ALTER TABLE par_ped_claro03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: par_ped_tiend03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS par_ped_tiend03 CASCADE;

CREATE TABLE par_ped_tiend03 (
  cve_doc TEXT,
  num_par INTEGER,
  cve_art TEXT,
  cve_sae TEXT,
  titulo TEXT,
  categoria TEXT,
  condicion TEXT,
  cant DOUBLE PRECISION,
  prec DOUBLE PRECISION,
  cve_moned TEXT,
  tot_partida DOUBLE PRECISION
);

ALTER TABLE par_ped_tiend03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ped_amazon03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ped_amazon03 CASCADE;

CREATE TABLE ped_amazon03 (
  tipo_doc TEXT,
  cve_doc TEXT,
  tip_doc_sig TEXT,
  doc_sig TEXT,
  status TEXT,
  moned TEXT,
  importe DOUBLE PRECISION,
  estado_sinc TEXT,
  f_compra TIMESTAMPTZ,
  tip_doc_e TEXT,
  cve_bita INTEGER,
  f_modificacion TIMESTAMPTZ,
  met_pago TEXT,
  detmet_pago TEXT,
  cumpli TEXT,
  nom_comp TEXT,
  calle_comp TEXT,
  entre_comp TEXT,
  ycalle_comp TEXT,
  cd_comp TEXT,
  mun_comp TEXT,
  pais_comp TEXT,
  dis_comp TEXT,
  edo_comp TEXT,
  cp_comp TEXT,
  bloq TEXT,
  enlazado TEXT
);

ALTER TABLE ped_amazon03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ped_claro03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ped_claro03 CASCADE;

CREATE TABLE ped_claro03 (
  tipo_doc TEXT,
  cve_doc TEXT,
  doc_sig TEXT,
  cve_clie TEXT,
  nom_comp TEXT,
  dire_comp TEXT,
  calle_comp TEXT,
  col_comp TEXT,
  cp_comp TEXT,
  cd_comp TEXT,
  edo_comp TEXT,
  muni_comp TEXT,
  edo_ped TEXT,
  f_coloca TIMESTAMPTZ,
  f_autoriza TIMESTAMPTZ,
  sku TEXT,
  f_embar TIMESTAMPTZ,
  num_guia TEXT,
  paquet TEXT,
  cant_prod DOUBLE PRECISION,
  cant_prod_ped DOUBLE PRECISION,
  tip_doc_e TEXT,
  cve_bita INTEGER,
  bloq TEXT,
  tip_doc_sig TEXT,
  estado_sinc TEXT,
  f_entrega TIMESTAMPTZ,
  obs_envio TEXT,
  importe DOUBLE PRECISION,
  enlazado TEXT,
  status TEXT
);

ALTER TABLE ped_claro03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: ped_tiend03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS ped_tiend03 CASCADE;

CREATE TABLE ped_tiend03 (
  tipo_doc TEXT,
  cve_doc TEXT,
  doc_sig TEXT,
  cve_tienda TEXT,
  cve_clie TEXT,
  estado TEXT,
  status TEXT,
  cve_vend TEXT,
  f_elab TIMESTAMPTZ,
  f_confir TIMESTAMPTZ,
  f_vigen TIMESTAMPTZ,
  f_last_update TIMESTAMPTZ,
  importe DOUBLE PRECISION,
  enlazado TEXT,
  tip_doc_e TEXT,
  cve_moned TEXT,
  tipcamb DOUBLE PRECISION,
  cve_bita INTEGER,
  bloq TEXT,
  tip_doc_sig TEXT,
  status_sae TEXT,
  estado_sinc TEXT,
  mod_envio TEXT,
  nick_name TEXT,
  correo TEXT,
  nombre_comp TEXT,
  apellido_comp TEXT,
  f_entrega TIMESTAMPTZ,
  cost_envio DOUBLE PRECISION,
  subtot DOUBLE PRECISION,
  comi_venta DOUBLE PRECISION,
  num_guia TEXT,
  entregado TEXT,
  obs_envio TEXT,
  cve_envio TEXT,
  tip_doc_seg TEXT,
  doc_seg TEXT,
  cve_info INTEGER,
  opcion_envio TEXT,
  pack_id TEXT
);

ALTER TABLE ped_tiend03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: periodos03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS periodos03 CASCADE;

CREATE TABLE periodos03 (
  cve_per INTEGER,
  tipo TEXT,
  fechaini TIMESTAMPTZ,
  fechafin TIMESTAMPTZ,
  descripcion TEXT
);

ALTER TABLE periodos03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: poli03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS poli03 CASCADE;

CREATE TABLE poli03 (
  cve_polit INTEGER,
  descr TEXT,
  st TEXT,
  cve_ini TEXT,
  cve_fin TEXT,
  lin_prod TEXT,
  vol_min DOUBLE PRECISION,
  clie_d TEXT,
  clie_h TEXT,
  clas_clie TEXT,
  v_dfech TIMESTAMPTZ,
  v_hfech TIMESTAMPTZ,
  t_pol TEXT,
  prc_mon TEXT,
  lista_prec INTEGER,
  val DOUBLE PRECISION,
  limunivta DOUBLE PRECISION,
  numuniven DOUBLE PRECISION,
  cve_zona TEXT,
  cve_alm INTEGER,
  debajo_min TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ
);

ALTER TABLE poli03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: precios03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS precios03 CASCADE;

CREATE TABLE precios03 (
  cve_precio INTEGER,
  descripcion TEXT,
  cve_bita INTEGER,
  status TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  con_impu TEXT
);

ALTER TABLE precios03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: precio_x_prod03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS precio_x_prod03 CASCADE;

CREATE TABLE precio_x_prod03 (
  cve_art TEXT,
  cve_precio INTEGER,
  precio DOUBLE PRECISION,
  uuid TEXT,
  version_sinc TIMESTAMPTZ,
  preciocimp DOUBLE PRECISION
);

ALTER TABLE precio_x_prod03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: prodsust03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS prodsust03 CASCADE;

CREATE TABLE prodsust03 (
  cve_art TEXT,
  cve_lista INTEGER
);

ALTER TABLE prodsust03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: prod_x_conc03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS prod_x_conc03 CASCADE;

CREATE TABLE prod_x_conc03 (
  cve_art TEXT,
  uuid TEXT,
  descripcion TEXT,
  noidentificacion TEXT
);

ALTER TABLE prod_x_conc03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: prov03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS prov03 CASCADE;

CREATE TABLE prov03 (
  clave TEXT,
  status TEXT,
  nombre TEXT,
  rfc TEXT,
  calle TEXT,
  numint TEXT,
  numext TEXT,
  cruzamientos TEXT,
  cruzamientos2 TEXT,
  colonia TEXT,
  codigo TEXT,
  localidad TEXT,
  municipio TEXT,
  estado TEXT,
  cve_pais TEXT,
  nacionalidad TEXT,
  telefono TEXT,
  clasific TEXT,
  fax TEXT,
  pag_web TEXT,
  curp TEXT,
  cve_zona TEXT,
  con_credito TEXT,
  diascred INTEGER,
  limcred DOUBLE PRECISION,
  cve_bita INTEGER,
  ult_pagod TEXT,
  ult_pagom DOUBLE PRECISION,
  ult_pagof TIMESTAMPTZ,
  ult_compd TEXT,
  ult_compm DOUBLE PRECISION,
  ult_compf TIMESTAMPTZ,
  saldo DOUBLE PRECISION,
  ventas DOUBLE PRECISION,
  descuento DOUBLE PRECISION,
  tip_tercero INTEGER,
  tip_opera INTEGER,
  cve_obs INTEGER,
  cuenta_contable TEXT,
  forma_pago INTEGER,
  beneficiario TEXT,
  titular_cuenta TEXT,
  banco TEXT,
  sucursal_banco TEXT,
  cuenta_banco TEXT,
  clabe TEXT,
  desc_otros TEXT,
  imprir TEXT,
  mail TEXT,
  nivelsec INTEGER,
  enviosilen TEXT,
  emailpred TEXT,
  modelo TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  val_rfc INTEGER,
  reg_fisc TEXT,
  uuid TEXT,
  coi_sinc TIMESTAMPTZ,
  cuenta_contable2 TEXT
);

ALTER TABLE prov03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: prov_clib03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS prov_clib03 CASCADE;

CREATE TABLE prov_clib03 (
  cve_prov TEXT,
  camplib1 TEXT,
  camplib2 TEXT,
  camplib3 TEXT,
  camplib4 INTEGER,
  camplib5 DOUBLE PRECISION,
  camplib6 DOUBLE PRECISION
);

ALTER TABLE prov_clib03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: prvprod03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS prvprod03 CASCADE;

CREATE TABLE prvprod03 (
  cve_art TEXT,
  cve_prov TEXT,
  costo DOUBLE PRECISION,
  t_entrega INTEGER
);

ALTER TABLE prvprod03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: resact03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS resact03 CASCADE;

CREATE TABLE resact03 (
  cve_campania TEXT,
  cve_actividad TEXT,
  cve_resultado TEXT,
  orden INTEGER,
  cve_actsig TEXT,
  duracion INTEGER,
  finaliza TEXT,
  genera_bita TEXT
);

ALTER TABLE resact03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: result03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS result03 CASCADE;

CREATE TABLE result03 (
  cve_resultado TEXT,
  descr TEXT,
  status TEXT
);

ALTER TABLE result03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: sucursales03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS sucursales03 CASCADE;

CREATE TABLE sucursales03 (
  cve_sucursal INTEGER,
  nombre TEXT,
  direccion TEXT,
  telefono TEXT,
  encargado TEXT,
  status TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION
);

ALTER TABLE sucursales03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: suc_almacen03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS suc_almacen03 CASCADE;

CREATE TABLE suc_almacen03 (
  cve_sucursal INTEGER,
  cve_almacen INTEGER
);

ALTER TABLE suc_almacen03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: suc_series03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS suc_series03 CASCADE;

CREATE TABLE suc_series03 (
  cve_sucursal INTEGER,
  tip_doc TEXT,
  cve_folio TEXT
);

ALTER TABLE suc_series03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: suc_usuario03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS suc_usuario03 CASCADE;

CREATE TABLE suc_usuario03 (
  cve_sucursal INTEGER,
  cve_usuario INTEGER
);

ALTER TABLE suc_usuario03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: talla03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS talla03 CASCADE;

CREATE TABLE talla03 (
  cve_lin TEXT,
  valor TEXT,
  descrip TEXT
);

ALTER TABLE talla03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: tblcontrol03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS tblcontrol03 CASCADE;

CREATE TABLE tblcontrol03 (
  id_tabla INTEGER,
  ult_cve INTEGER
);

ALTER TABLE tblcontrol03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: tipo_terceros03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS tipo_terceros03 CASCADE;

CREATE TABLE tipo_terceros03 (
  tipo INTEGER,
  descr TEXT
);

ALTER TABLE tipo_terceros03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: vend03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS vend03 CASCADE;

CREATE TABLE vend03 (
  cve_vend TEXT,
  status TEXT,
  nombre TEXT,
  comi DOUBLE PRECISION,
  clasific TEXT,
  correoe TEXT,
  uuid TEXT,
  version_sinc TIMESTAMPTZ
);

ALTER TABLE vend03 DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- TABLA ESPEJO: zona03
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS zona03 CASCADE;

CREATE TABLE zona03 (
  cve_zona TEXT,
  cve_padre TEXT,
  texto TEXT,
  tnodo TEXT,
  cta_cont TEXT,
  impueflete DOUBLE PRECISION,
  montoflete DOUBLE PRECISION,
  formula TEXT,
  status TEXT
);

ALTER TABLE zona03 DISABLE ROW LEVEL SECURITY;

