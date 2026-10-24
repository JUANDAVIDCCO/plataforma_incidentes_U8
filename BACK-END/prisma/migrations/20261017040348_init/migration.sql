-- CreateTable
CREATE TABLE "Incidente" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(191) NOT NULL,
    "descripcion" TEXT,
    "prioridad" VARCHAR(191) NOT NULL,
    "estado" VARCHAR(191) NOT NULL DEFAULT 'Registrado',
    "archivoRuta" VARCHAR(191),
    "archivoNombre" VARCHAR(191),
    "archivoMime" VARCHAR(191),

    CONSTRAINT "Incidente_pkey" PRIMARY KEY ("id")
);
