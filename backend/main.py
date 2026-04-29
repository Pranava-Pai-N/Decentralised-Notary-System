# from fastapi import FastAPI, UploadFile, File, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import JSONResponse
# import hashlib

# app = FastAPI(title="Blockchain Notary API")


# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

# @app.get("/")
# async def root():
#     return {"success" : True , "message": "Blockchain Notary API is running"}

# @app.post("/hash-document")
# async def hash_document(file: UploadFile = File(...)):
#     try:
#         if not file:
#             raise HTTPException(
#                 status_code=400,
#                 detail="No file provided"
#             )
        
#         file_extension = None
#         if file.filename:
#             for ext in ALLOWED_EXTENSIONS:
#                 if file.filename.lower().endswith(ext):
#                     file_extension = ext
#                     break
        
#         if not file_extension:
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
#             )
        
#         content = await file.read()
        
#         if not content or len(content) == 0:
#             raise HTTPException(
#                 status_code=400,
#                 detail="File is empty"
#             )
        
#         file_hash = hashlib.sha256(content).hexdigest()
        
#         hash_with_prefix = f"0x{file_hash}"
        
#         return JSONResponse(
#             status_code=200,
#             content={
#                 "success": True,
#                 "file_name": file.filename,
#                 "hash": hash_with_prefix,
#                 "algorithm": "SHA-256"
#             }
#         )
    
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"An error occurred while processing the file: {str(e)}"
#         )

# @app.get("/health")
# async def health_check():
#     return {"status": "healthy"}


from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import hashlib
from health import router as health_router
from server_stats import server_stats

app = FastAPI(title="Blockchain Notary API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

@app.get("/")
async def root():
    return {"success" : True , "message": "Blockchain Notary API is running"}

@app.post("/hash-document")
async def hash_document(file: UploadFile = File(...)):
    try:
        if not file:
            raise HTTPException(
                status_code=400,
                detail="No file provided"
            )
        
        file_extension = None
        if file.filename:
            for ext in ALLOWED_EXTENSIONS:
                if file.filename.lower().endswith(ext):
                    file_extension = ext
                    break
        
        if not file_extension:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        content = await file.read()
        
        if not content or len(content) == 0:
            raise HTTPException(
                status_code=400,
                detail="File is empty"
            )
        
        server_stats.increment_files_processed()
        
        file_hash = hashlib.sha256(content).hexdigest()
        hash_with_prefix = f"0x{file_hash}"
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "file_name": file.filename,
                "hash": hash_with_prefix,
                "algorithm": "SHA-256",
                # --- NEW: Appended non-breaking metadata ---
                "metadata": {
                    "size_bytes": len(content),
                    "content_type": file.content_type
                }
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the file: {str(e)}"
        )

app.include_router(health_router)
