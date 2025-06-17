from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from PyPDF2 import PdfReader
import re
from datetime import datetime

# Configure Tesseract path if it's not in your PATH environment variable
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe' # Example for Windows

app = Flask(__name__, static_folder='static')
CORS(app) # Enable CORS for all routes, allowing your frontend to make requests

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def extract_biomarker_data(text):
    # Define patterns for different biomarkers
    patterns = {
        'total-cholesterol': r'TOTAL CHOLESTEROL\s+PHOTOMETRY\s*<\s*\d+\.?\d*\s*mg/dL\s*(\d+\.?\d*)',
        'ldl': r'LDL CHOLESTEROL - DIRECT\s+PHOTOMETRY\s*<\s*\d+\.?\d*\s*mg/dL\s*(\d+\.?\d*)',
        'hdl': r'HDL CHOLESTEROL - DIRECT\s*(\d+\.?\d*)\s*mg/dL',
        'triglycerides': r'TRIGLYCERIDES\s+PHOTOMETRY\s*<\s*\d+\.?\d*\s*mg/dL\s*(\d+\.?\d*)',
        'creatinine': r'CREATININE - SERUM\s+PHOTOMETRY\s*\d+\.?\d*-\d+\.?\d*\s*mg/dL\s*(\d+\.?\d*)',
        'vitamin-d': r'ng/mL\s*(\d+\.?\d*)\s*25-OH VITAMIN D \(TOTAL\)',
        'vitamin-b12': r'pg/mL\s*(\d+\.?\d*)\s*VITAMIN B-12',
        'hba1c': r'HbA1c - \(HPLC\)\s*H\.P\.L\.C\s*%\s*(\d+\.?\d*)',
        'est-glomerular-filtration-rate': r'mL/min/1.73 m2\s*(\d+\.?\d*)\s*EST\. GLOMERULAR FILTRATION RATE \(eGFR\)'
    }
    
    # Extract date from text (assuming format like "DD Mon YYYY" or "DD/MM/YYYY")
    date_pattern = r'(\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
    date_match = re.search(date_pattern, text)
    if date_match:
        date_str = date_match.group(1)
        try:
            # Try parsing DD Mon YYYY format
            date = datetime.strptime(date_str, '%d %b %Y').strftime('%Y-%m-%d')
        except ValueError:
            try:
                # Try parsing DD/MM/YYYY or DD-MM-YYYY format
                date = datetime.strptime(date_str, '%d/%m/%Y').strftime('%Y-%m-%d')
            except ValueError:
                try:
                    date = datetime.strptime(date_str, '%d-%m-%Y').strftime('%Y-%m-%d')
                except ValueError:
                    print(f"Could not parse date \'{date_str}\'. Using current date.")
                    date = datetime.now().strftime('%Y-%m-%d')
    else:
        date = datetime.now().strftime('%Y-%m-%d')

    biomarker_data = {}
    
    for biomarker, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                value = float(match.group(1))
                if biomarker in biomarker_data:
                    biomarker_data[biomarker].append({'date': date, 'value': value})
                else:
                    biomarker_data[biomarker] = [{'date': date, 'value': value}]
            except ValueError:
                print(f"Could not convert value to float for {biomarker}: {match.group(1)}")
    
    return biomarker_data

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and file.filename.endswith('.pdf'):
        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        try:
            # Read PDF file
            reader = PdfReader(filepath)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            print(f"Extracted text from PDF:\n{text}")

            # Extract biomarker data from text
            biomarker_data = extract_biomarker_data(text)
            print(f"Extracted biomarker data: {biomarker_data}")

            # Clean up the temporarily saved file
            os.remove(filepath)

            return jsonify(biomarker_data), 200

        except Exception as e:
            print(f"Error processing file: {e}")
            return jsonify({'error': f'Error processing file: {str(e)}'}), 500
    else:
        return jsonify({'error': 'Invalid file type. Please upload a PDF file.'}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000) # Run on port 5000, matching your frontend fetch call